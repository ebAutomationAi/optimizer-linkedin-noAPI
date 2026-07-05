# Auditoría end-to-end — Frontend Optimizer LinkedIn (`index.html`) vs `server.js`

Fecha: 2026-07-05
Alcance: `index.html` (single-file, vanilla JS) contra `optimizer-server/server.js` real.

## 0. Confirmación de causas raíz previas (no re-investigadas, solo verificadas)

Verificado por lectura de `server.js` + `server.log` de una ejecución real previa contra el código actual:

| Causa raíz | Evidencia | Estado |
|---|---|---|
| `ANTHROPIC_API_KEY` heredada al subproceso | `server.js:115-117` — `delete childEnv.ANTHROPIC_API_KEY; delete childEnv.ANTHROPIC_AUTH_TOKEN;` antes de `spawn()` | ✅ Sigue resuelto |
| Modelo Sonnet 5 prohibido | `server.js:122` — `'--model', 'claude-sonnet-4-6'` | ✅ Sigue resuelto |
| Timeout por thinking por defecto | `server.js:123` — `'--effort', 'low'` | ✅ Sigue resuelto |

Evidencia adicional de ejecución real (`optimizer-server/server.log`, generado por el `server.js` actual):
```
[analyze] sesión iniciada (modelo: claude-sonnet-4-6)
[analyze] usando herramienta: Read (...)
[analyze] resultado de herramienta recibido, continuando análisis...
[analyze] resultado de herramienta recibido, continuando análisis...
[analyze] redactando respuesta...
[analyze] terminado en 124484ms (error: false)
```
124.5 s, sin error, por debajo del `TIMEOUT_MS = 300000` del backend. Consistente con los ~129 s reportados como validados. Esta traza se usa como evidencia end-to-end real (punto 3 de la metodología) en vez de relanzar un análisis completo redundante (mismo coste, mismo resultado, ya validado con el `server.js` actual).

## 1. Tabla resumen

| # | Sospechoso | Reproducido | Severidad | Patch propuesto |
|---|---|---|---|---|
| S1 | Pérdida del último evento NDJSON (buffer sin `\n` final) | Sí, en aislamiento. **No** contra `server.js` real (siempre termina en `\n` antes de `res.end()`) | Media (latente/defensivo) | Sí — combinado con S2 |
| S2 | `JSON.parse` sin try/catch aborta todo el stream | Sí, en aislamiento. **No** contra `server.js` real (el propio server ya filtra líneas corruptas de `child.stdout`) | Media (latente/defensivo) | Sí — combinado con S1 |
| S3 | Sin timeout en el `fetch` de `/api/analyze` | **Sí** | Alta | Sí |
| S4 | Sin validación de shape de `apiData` → error críptico | **Sí** (4 variantes de payload mutilado) | Alta | Sí |
| S5 | Doble submit / race entre lecturas de PDF | **Sí** | Media | Sí |
| S6 | `OPTIMIZER_BACKEND_URL` hardcodeado | Sí (inspección) | Baja | Sí |
| S7 | Timers de progreso desacoplados de la duración real | Sí (inspección + log real) | Baja (cosmético) | Recomendación condicionada, no aplicada |
| — | `sessionStorage.clear()` global en `resetApp` | Sí (inspección) | Baja | Sí |
| — | `populateResults()` antes de `setState('results')` | No | — | Descartado |
| — | CORS bloqueando origen `file://`/cross-origin | No | — | Descartado |
| — | Race "soltar 2º PDF rápido" cancela el 1º | Es el mismo mecanismo que S5 | Media | Mismo fix que S5 |

---

## 2. Bugs confirmados

### S1 + S2 — Pérdida de eventos NDJSON (buffer final + parse sin try/catch)

**Ubicación:** `index.html:1197-1215`.

**Evidencia S1** (mock backend que cierra el stream sin `\n` final en el evento `done`):

Script (`test-s1.mjs`), backend mock:
```js
res.write(JSON.stringify({ type: 'progress', step: 'started' }) + '\n');
res.write(JSON.stringify({ type: 'progress', step: 'generating' }) + '\n');
res.end(JSON.stringify({ type: 'done', data: { overall_score: 77 } })); // SIN '\n'
```
Salida real ejecutando el bucle de `index.html` literal:
```
finalData: null
leftoverBuffer (nunca parseado): "{\"type\":\"done\",\"data\":{\"overall_score\":77}}"
Resultado real: finalData = null => if(!finalData) throw "El servidor no devolvió resultados."
```
El evento `done` con el score 77 llegó al cliente pero nunca se parseó: quedó atrapado en `buffer` tras el `break` del `while`.

**Contraprueba contra el patrón real de `server.js`** (`send()` siempre añade `\n`, y `res.end()` se llama después de la última `send()` — `server.js:220,225-235`):
```
finalData: { overall_score: 77 }
leftoverBuffer: ""
```
Con el comportamiento actual de `server.js`, S1 **no se dispara** en operación normal (éxito, error de `runClaude`, o timeout de 300 s): todos esos caminos usan `send()` y terminan en `\n` antes de `res.end()`. El riesgo es real solo si el proceso Node o la conexión TCP se cortan a mitad de un `write()` (crash del proceso, proxy intermedio, reinicio con nodemon) — exactamente la clase de fallo silencioso que preocupa en el objetivo de la auditoría, y un fix de 3 líneas sin downside.

**Evidencia S2** (línea corrupta intercalada entre dos válidas, `test-s2.mjs`):
```js
send({ type: 'progress', step: 'started' });
res.write('esto no es json valido {{{\n');
send({ type: 'done', data: { overall_score: 77 } });
```
Salida:
```
SyntaxError: Unexpected token 'e', "esto no es"... is not valid JSON
Efecto en submitToAPI: cae en el catch externo -> "Ha ocurrido un error en la llamada: Unexpected token 'e'..."
El evento done con score=77 SE PERDIÓ aunque el backend lo envió correctamente.
```
Contra `server.js` real esto tampoco se dispara hoy: el propio server ya envuelve el `JSON.parse` de `child.stdout` en try/catch (`server.js:146-151`) y solo reenvía objetos que él mismo serializa. Pero es la misma clase de fragilidad que S1: un solo carácter corrupto en cualquier punto futuro (proxy, otra fuente de backend) tira todo el resultado ya generado.

**Patch propuesto** (S1 y S2 comparten la misma cirugía, se combinan en un solo reemplazo):

```js
// index.html — reemplazo líneas 1197-1215
                    const processLine = (line) => {
                        if (!line.trim()) return;
                        let evt;
                        try {
                            evt = JSON.parse(line);
                        } catch (parseErr) {
                            console.error('[optimizer] Línea NDJSON inválida, se ignora:', line, parseErr);
                            return;
                        }
                        if (evt.type === 'progress') {
                            this.handleProgressEvent(evt);
                        } else if (evt.type === 'done') {
                            finalData = evt.data;
                        } else if (evt.type === 'error') {
                            serverError = evt.message;
                        }
                    };

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop();
                        lines.forEach(processLine);
                    }

                    if (buffer.trim()) {
                        processLine(buffer);
                    }
```

---

### S3 — Sin timeout en el `fetch` de `/api/analyze`

**Ubicación:** `index.html:1172-1180`.

**Evidencia** (`test-s3.mjs`, backend que acepta la conexión pero nunca escribe ni cierra):
```
Lanzando fetch SIN timeout/AbortController (idéntico a index.html)...
Tras 8052ms: fetch() sigue still-pending-after-8s
```
El `fetch` (idéntico al de `index.html`, sin `signal`) sigue pendiente indefinidamente; se verificó hasta 8 s pero no hay ningún mecanismo que lo corte nunca. El usuario queda en la pantalla "Analizando tu perfil..." sin feedback ni forma de cancelar.

**Hallazgo importante sobre el default sugerido en el encargo:** el brief propone un timeout cliente de 240 s "alineado con la duración real de ~129 s más margen". Esto es **inseguro**: `server.js:113` fija `TIMEOUT_MS = 300000` (300 s) como límite duro del propio backend. Un timeout cliente de 240 s dispararía un abort falso-positivo en análisis que el backend todavía considera legítimos (entre 240 s y 300 s), antes de que el propio servidor tenga oportunidad de responder con su error de timeout. El valor cliente debe ser **mayor** que el `TIMEOUT_MS` del backend.

**Patch propuesto:**

```js
// index.html — reemplazo líneas 1166-1236 (función submitToAPI completa)
            async submitToAPI() {
                if (this.inFlight) return;
                this.inFlight = true;

                const errorDiv = document.getElementById('upload-error');

                this.setState('analyzing');

                // > TIMEOUT_MS del backend (server.js: 300000ms) para no adelantarse
                // a su propio límite y generar abortos falso-positivo.
                const CLIENT_TIMEOUT_MS = 320000;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

                try {
                    const response = await fetch(`${OPTIMIZER_BACKEND_URL}/api/analyze`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            base64Data: this.base64Data
                        }),
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        let message = `Error del servidor (status ${response.status})`;
                        try {
                            const errData = await response.json();
                            message = errData.error || message;
                        } catch {}
                        throw new Error(message);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    let finalData = null;
                    let serverError = null;

                    const processLine = (line) => {
                        if (!line.trim()) return;
                        let evt;
                        try {
                            evt = JSON.parse(line);
                        } catch (parseErr) {
                            console.error('[optimizer] Línea NDJSON inválida, se ignora:', line, parseErr);
                            return;
                        }
                        if (evt.type === 'progress') {
                            this.handleProgressEvent(evt);
                        } else if (evt.type === 'done') {
                            finalData = evt.data;
                        } else if (evt.type === 'error') {
                            serverError = evt.message;
                        }
                    };

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop();
                        lines.forEach(processLine);
                    }

                    if (buffer.trim()) {
                        processLine(buffer);
                    }

                    if (serverError) {
                        throw new Error(serverError);
                    }
                    if (!finalData) {
                        throw new Error('El servidor no devolvió resultados.');
                    }

                    this.validateApiData(finalData);

                    this.completeAllSteps();
                    this.apiData = finalData;

                    this.populateResults();
                    this.setState('results');

                } catch (err) {
                    this.clearProgressTimers();
                    this.setState('upload');
                    if (err.name === 'AbortError') {
                        errorDiv.innerText = `El análisis ha tardado más de ${CLIENT_TIMEOUT_MS / 1000}s y se ha cancelado. Inténtalo de nuevo.`;
                    } else {
                        errorDiv.innerText = `Ha ocurrido un error en la llamada: ${err.message}`;
                    }
                    errorDiv.style.display = 'block';
                } finally {
                    clearTimeout(timeoutId);
                    this.inFlight = false;
                }
            },
```

(Este bloque ya incluye los fixes de S1/S2/S4/S5 para evitar publicar tres diffs superpuestos sobre la misma función; ver detalle de cada uno en su sección.)

---

### S4 — Sin validación de shape de `apiData`

**Ubicación:** `index.html:1238-1259` (`populateResults`) y funciones que llama.

**Evidencia** (navegador real, `app.populateResults()` con payloads mutilados vía `mcp__claude-in-chrome__javascript_tool`):

```json
{
  "caseA_missing_section": "TypeError: Cannot read properties of undefined (reading 'score')",
  "caseB_missing_checklist": "TypeError: Cannot read properties of undefined (reading 'forEach')",
  "caseC_problems_as_string": "TypeError: sectionData.problems.forEach is not a function",
  "caseD_missing_strategy": "TypeError: Cannot read properties of undefined (reading 'objective')",
  "caseE_control_good": "OK sin error"
}
```

**Matiz importante:** se verificó el flujo real completo (mock de `fetch` devolviendo un `done` con `sections.featured` ausente, pasando por `submitToAPI()` real, no una llamada aislada a `populateResults()`):
```json
{
  "finalState": "upload",
  "visibleScreen": "upload-screen",
  "errorVisible": "block",
  "errorText": "Ha ocurrido un error en la llamada: Cannot read properties of undefined (reading 'score')"
}
```
El `try/catch` externo de `submitToAPI` (`index.html:1171-1235`) **sí** atrapa la excepción y devuelve al usuario a la pantalla de subida con un mensaje — **no** se queda colgado en "Analizando...". El bug real no es un cuelgue silencioso, sino un mensaje de error críptico y no accionable ("Cannot read properties of undefined (reading 'score')") que no dice qué campo faltó ni por qué, dificultando el diagnóstico exactamente como ocurrió con las causas raíz previas.

**Patch propuesto** (nuevo método, insertar tras la línea 1236, antes de `populateResults`):

```js
// index.html — inserción tras línea 1236 (antes de populateResults)
            validateApiData(data) {
                const missing = [];
                const need = (val, path) => { if (val === undefined || val === null) missing.push(path); };
                const needArray = (val, path) => { if (val !== undefined && val !== null && !Array.isArray(val)) missing.push(`${path} (se esperaba un array)`); };

                need(data.profile, 'profile');
                need(data.overall_score, 'overall_score');

                need(data.strategy, 'strategy');
                if (data.strategy) {
                    ['objective', 'icp', 'mechanism', 'cta_current', 'gaps', 'strengths'].forEach(k => need(data.strategy[k], `strategy.${k}`));
                    needArray(data.strategy.gaps, 'strategy.gaps');
                    needArray(data.strategy.strengths, 'strategy.strengths');
                }

                need(data.sections, 'sections');
                const sectionKeys = ['headline', 'about', 'experience', 'featured', 'skills', 'recommendations'];
                if (data.sections) {
                    sectionKeys.forEach(key => {
                        const sec = data.sections[key];
                        need(sec, `sections.${key}`);
                        if (sec) {
                            ['score', 'badge', 'current', 'problems', 'optimized', 'why', 'checklist'].forEach(f => need(sec[f], `sections.${key}.${f}`));
                            needArray(sec.problems, `sections.${key}.problems`);
                            needArray(sec.why, `sections.${key}.why`);
                            needArray(sec.checklist, `sections.${key}.checklist`);
                        }
                    });
                }

                if (missing.length > 0) {
                    throw new Error(`Respuesta incompleta del análisis (${missing.length} campo(s) ausente(s)): ${missing.join(', ')}`);
                }
            },

```

Con esto, el mismo caso de prueba anterior mostraría en `errorDiv`:
`"Ha ocurrido un error en la llamada: Respuesta incompleta del análisis (7 campo(s) ausente(s)): sections.featured, ..."`
— accionable y diagnosticable de un vistazo, en vez de un `TypeError` genérico.

---

### S5 — Doble submit / race entre lecturas de PDF

**Ubicación:** `index.html:1086-1112` (`handleFile`) y `1166-1236` (`submitToAPI`).

**Evidencia** (llamando `app.submitToAPI()` dos veces seguidas con `fetch` mockeado para no resolver, contando invocaciones reales):
```json
{
  "fetchCallCount": 2,
  "currentState": "analyzing",
  "hasInFlightGuard": false
}
```
Dos `fetch` concurrentes confirmados, sin ningún guard (`app.inFlight` no existe en el código actual).

**Matiz sobre superficie de ataque real:** una vez `setState('analyzing')` se ejecuta, la `drop-zone` queda con `display:none` (regla `.screen{display:none}` / `.screen.active{display:block}`), por lo que un usuario **no puede** re-disparar el análisis haciendo clic o soltando un archivo en la UI mientras ya está en pantalla "Analizando...". La ventana real explotable es la que menciona el brief como "race": entre que el usuario suelta/selecciona el archivo y que `reader.onload` (asíncrono) invoca `submitToAPI()` — mientras el primer `FileReader` sigue leyendo, el drop-zone sigue visible, y un segundo drop rápido crea un segundo `FileReader` independiente. Cualquiera de los dos que resuelva último sobrescribe `this.base64Data` y llama `submitToAPI()` de nuevo, sin cancelar el primero. Esto es exactamente el mismo mecanismo que el punto "Race: soltar 2º PDF" de "Otros puntos a verificar" — un solo fix los cubre a ambos.

**Patch propuesto:**

```js
// index.html — reemplazo líneas 1086-1112
            handleFile(file) {
                if (this.inFlight) return;

                const errorDiv = document.getElementById('upload-error');
                errorDiv.style.display = 'none';

                if (file.type !== 'application/pdf') {
                    errorDiv.innerText = 'Error: El archivo debe ser un documento PDF.';
                    errorDiv.style.display = 'block';
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    errorDiv.innerText = 'Error: El tamaño del archivo supera el límite de 5 MB.';
                    errorDiv.style.display = 'block';
                    return;
                }

                this.inFlight = true;

                const reader = new FileReader();
                reader.onload = () => {
                    this.base64Data = reader.result.split(',')[1];
                    this.submitToAPI();
                };
                reader.onerror = () => {
                    this.inFlight = false;
                    errorDiv.innerText = 'Error al leer el archivo PDF.';
                    errorDiv.style.display = 'block';
                };
                reader.readAsDataURL(file);
            },
```

(El resto del guard —`if (this.inFlight) return;` al entrar en `submitToAPI` y `this.inFlight = false;` en su `finally`— ya está incluido en el patch de S3 más arriba, porque toca la misma función.)

---

### S6 — `OPTIMIZER_BACKEND_URL` hardcodeado

**Ubicación:** `index.html:1028`.

Confirmado por inspección directa: `const OPTIMIZER_BACKEND_URL = 'http://localhost:3001';` es una constante fija, sin punto de configuración. Bloquea cualquier despliegue donde el frontend se sirva desde otra máquina/puerto de la LAN.

**Patch propuesto:**

```js
// index.html — reemplazo línea 1028
        const OPTIMIZER_BACKEND_URL = window.OPTIMIZER_BACKEND_URL || 'http://localhost:3001';
```

Con esto, un despliegue en LAN puede inyectar, antes de este `<script>`, un bloque `<script>window.OPTIMIZER_BACKEND_URL = 'http://192.168.1.50:3001';</script>` sin tocar el resto del archivo ni añadir dependencias. Fallback a `localhost:3001` intacto para el caso local actual.

---

### Menor — `sessionStorage.clear()` global en `resetApp`

**Ubicación:** `index.html:1422-1430`.

Confirmado por inspección: `sessionStorage.clear()` borra todo el `sessionStorage` del origen, no solo las claves `chk-*` que la app usa (`initCheckboxes`, `index.html:1386-1392`). Si en el futuro conviven otras claves de sessionStorage en el mismo origen (u otra pestaña del mismo dominio comparte storage), se perderían sin relación con esta app.

**Patch propuesto:**

```js
// index.html — reemplazo líneas 1422-1430
            resetApp() {
                Object.keys(sessionStorage)
                    .filter(k => k.startsWith('chk-'))
                    .forEach(k => sessionStorage.removeItem(k));
                this.base64Data = null;
                this.apiData = null;
                this.totalCheckboxes = 0;
                this.inFlight = false;
                document.getElementById('file-input').value = '';
                document.getElementById('upload-error').style.display = 'none';
                this.setState('upload');
            }
```

---

## 3. No reproducidos (descartados con evidencia)

### `populateResults()` ejecuta antes de `setState('results')`
**Descartado.** `populateResults` solo asigna `innerText`/`innerHTML` y añade listeners; ninguna de esas operaciones requiere que el elemento esté visible (`display:block`) — funcionan igual con `display:none`. Se confirmó en el caso de control (`caseE_control_good`) del test de S4: `populateResults()` se ejecutó sin error con el `results-screen` en distintos estados de visibilidad a lo largo de los tests. El único punto que sí depende de layout (`switchTab`, que usa `offsetTop` para el scroll) se ejecuta más tarde, ya con la pantalla visible tras `setState('results')`. No hay bug aquí.

### CORS bloqueando el frontend
**Descartado.** Probado en dos niveles:
1. `curl` directo al backend real con cabecera `Origin: null` (simula el origen que envía un `fetch` desde una página `file://`):
   ```
   HTTP/1.1 400 Bad Request
   Access-Control-Allow-Origin: *
   ```
2. `fetch` real, cross-origin, ejecutado en el navegador desde `http://localhost:8080` (sirviendo `index.html`) hacia `http://localhost:3001` (backend real, ya en ejecución):
   ```json
   {"ok":true,"status":400,"body":{"error":"Falta el PDF (base64Data)."},"corsBlocked":false}
   ```
`server.js:10` usa `app.use(cors())` sin restricciones, que refleja `Access-Control-Allow-Origin: *` para cualquier origen (incluyendo `null` de `file://`), sin credenciales involucradas. No hay bloqueo de CORS en ningún escenario de despliegue local o LAN simple.

---

## 4. S7 — Timers de progreso desacoplados (no se aplica patch, solo diagnóstico)

**Ubicación:** `index.html:1149-1164` + `server.js:153-172`.

Confirmado por inspección + evidencia real (`server.log`): en la traza real solo se registran los eventos `started` → `reading_pdf` (Read) → `tool_result` ×2 → `generating`, y a partir de ahí **silencio total** durante el resto de los ~124 s hasta `done`. El backend actual (`server.js`, invocación `claude -p ... --output-format stream-json --verbose`) no emite ninguna señal intermedia real durante la fase de generación de texto: solo hay un evento `assistant`/`text` cuando el bloque de texto llega completo. Los timers de 25 s/60 s/100 s (`index.html:1157-1161`) son, por tanto, una estimación sin correlato real, y quedan "congelados" en el paso 5 durante ~20-25 s adicionales antes de que llegue `done`.

Se verificó que el CLI de `claude` soporta `--include-partial-messages` ("Include partial message chunks as they arrive — only works with --print and --output-format=stream-json"), lo que técnicamente permitiría al backend emitir progreso granular real durante la generación (p.ej. basado en caracteres/tokens emitidos) y sustituir los timers por una barra de progreso genuina.

**No se propone un patch de frontend aislado** porque la mejora real requiere tocar `server.js` (añadir el flag y reenviar los nuevos eventos) y ampliar el contrato NDJSON — algo explícitamente fuera de alcance salvo justificación explícita. Se deja como recomendación condicionada a aprobación: si se autoriza tocar `server.js`, vale la pena evaluarlo; si no, los timers actuales son un compromiso cosmético aceptable y de bajo riesgo (no afectan la corrección del resultado final, solo la percepción de progreso).

---

## 5. Notas de método

- Todos los repros de S1/S2/S3 se hicieron replicando **literalmente** el fragmento de código de `index.html` en un módulo Node (`parse-loop.mjs`) y ejecutándolo contra servidores HTTP mock reales (`node:http`) vía `fetch` nativo (Node 22) — no hay simulación aproximada, es el mismo bytecode de parsing que corre en el navegador.
- Los repros de S4/S5 y las contrapruebas de CORS se hicieron en un Chrome real (vía `claude-in-chrome`), sirviendo `index.html` desde un servidor estático en `http://localhost:8080` y ejecutando `app.*` directamente en el contexto de la página, incluyendo un mock de `window.fetch` para simular respuestas NDJSON del backend sin necesidad de invocar la CLI real de Claude repetidamente.
- El backend real (`server.js` en `http://localhost:3001`) se usó tal cual para: la prueba de CORS cross-origin, la validación 400 sin `base64Data`, y como fuente de la traza de tiempos real (`server.log`) de una ejecución completa ya validada con el código actual.
