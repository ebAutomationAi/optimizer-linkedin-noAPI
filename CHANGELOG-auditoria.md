# Changelog — Aplicación de patches de la auditoría del frontend

Rama: `fix/auditoria-frontend` (creada desde `main`, commit baseline `0158932`).
Fuente: `informe-auditoria-frontend.md`.
Cada patch se aplicó, verificó en el navegador (sin regresión en el arranque) y se comiteó por separado antes de pasar al siguiente.

| Commit | Sospechoso | Resumen | Resultado de verificación |
|---|---|---|---|
| `672aea0` | S3 | `AbortController` con timeout de 320s (300s del backend + 20s de margen) en el `fetch` de `/api/analyze`; `AbortError` diferenciado en consola y en `errorDiv`; timer limpiado en `finally`. | App arranca limpia (`upload-screen`, sin errores de consola). Diferido a la verificación de S5 el test del camino `AbortError` real (ver `edd3885`). |
| `176133e` | S4 | Nuevo método `validateApiShape(data)` que recorre `profile`, `overall_score`, `strategy.*` y `sections.{6 claves}.*` y devuelve el primer campo ausente. `submitToAPI` lanza `Error` descriptivo si falta algo, antes de `setState('results')`. | Test negativo con payload real mutilado (`sections.featured` ausente) inyectado vía `submitToAPI()` real: `errorDiv` mostró `"Ha ocurrido un error en la llamada: Respuesta del servidor incompleta: falta sections.featured"` — campo exacto, no `TypeError` genérico. |
| `edd3885` | S5 | `handleFile` marca `this.inFlight = true` antes de leer el PDF con `FileReader` y descarta cualquier drop mientras haya un análisis en curso; `submitToAPI` libera el flag en su `finally`. **Se detectó y corrigió una regresión propia durante el desarrollo**: un guard duplicado al inicio de `submitToAPI` (`if (this.inFlight) return; this.inFlight = true;`) chocaba con el flag ya puesto por `handleFile`, dejando la app bloqueada en `analyzing` sin disparar nunca el `fetch`. Se retiró el guard redundante de `submitToAPI`, dejando solo el de `handleFile` + el reset en `finally`. | 4 pruebas en navegador: (1) flujo normal single-file completa y libera `inFlight`; (2) doble drop rápido: solo 1 `fetch` real, segundo bloqueado por el guard; (3) camino `AbortError` simulado: `inFlight` se libera y muestra el mensaje diferenciado; (4) regresión detectada y corregida antes de comitear (ver nota). |
| `9c2231b` | S1 + S2 | Parseo de cada línea NDJSON extraído a `processLine()`, envuelto en `try/catch` (línea corrupta → `console.warn` y se descarta, sin abortar el análisis) y reutilizado también para el buffer residual tras el último `reader.read()` (`done:true`), que antes se perdía si el stream cerraba sin `\n` final. | Reproducidos ambos mocks del informe (evento `done` sin `\n` final, y línea corrupta intercalada) contra el código ya parcheado: en los dos casos `app.state` termina en `results` con `apiData.profile.name === "Jane Doe"` — el `done` ya no se pierde. |
| `dd80659` | S6 | `OPTIMIZER_BACKEND_URL` ahora es `window.OPTIMIZER_BACKEND_URL \|\| 'http://localhost:3001'`. | App arranca limpia; `OPTIMIZER_BACKEND_URL` resuelve a `'http://localhost:3001'` sin que exista la variable global (fallback intacto). |
| `dde48cd` | sessionStorage (menor) | `resetApp` ya no llama `sessionStorage.clear()`; borra solo las claves con prefijo `chk-`. | Se sembraron `chk-headline-0` y una clave no relacionada; tras `resetApp()`, la primera desaparece y la segunda se preserva. |

## Verificación final (tras el último commit)

**Test end-to-end real contra `server.js`** (PDF de prueba generado ad hoc con un perfil ficticio "Jane Doe", sin invocar de nuevo la CLI para no duplicar coste — la misma ejecución sirvió para medir tiempos y para alimentar la prueba de render):

```
status: 200, content-type: application/x-ndjson

Fases:
  started      +4.3s
  reading_pdf  +7.5s
  tool_result  +7.6s
  generating   +121.2s
  done         +121.7s

Tiempo total: 121.7s (dentro del rango ~124-129s previamente validado, por debajo del TIMEOUT_MS=300000 del backend y del CLIENT_TIMEOUT_MS=320000 del frontend)
```

El resultado real (`overall_score: 58`, 6 secciones completas, `strategy` completo) se inyectó en el navegador reproduciendo el NDJSON exacto que devolvió el backend, confirmando:
- `app.state` → `results`, pantalla `results-screen` visible.
- Perfil, score global (58) y las 7 tarjetas de score (`Global` + 6 secciones) pintadas.
- Checklist de "Titular" con sus 4 ítems renderizados.
- Texto optimizado del titular presente (158 caracteres).
- Captura de pantalla tomada confirmando el dashboard visualmente completo.

**Test negativo S4** (payload con `sections.featured` ausente, vía `submitToAPI()` real con `fetch` mockeado): `errorDiv` mostró `"Respuesta del servidor incompleta: falta sections.featured"` en vez de un `TypeError` críptico.

## Nota sobre una desviación respecto al encargo original

El encargo pedía explícitamente un guard "al entrar en `submitToAPI`" además del guard en `handleFile`. Al implementarlo literalmente (check + set de `this.inFlight` al inicio de ambas funciones), se probó el flujo normal y la app quedaba bloqueada indefinidamente: `handleFile` ya deja `inFlight = true` antes de invocar `submitToAPI` (necesario para cerrar la ventana de carrera mientras el `FileReader` lee), así que el guard duplicado en `submitToAPI` interpretaba cualquier llamada legítima como un duplicado y abortaba sin llamar a `fetch`. Se optó por un único punto de "set" (en `handleFile`) y un único punto de "reset" (en el `finally` de `submitToAPI`), documentado con un comentario en el propio código. Se prefirió corregir esto sobre la marcha en vez de aplicar la instrucción literal, ya que habría introducido una regresión más grave que el bug que se buscaba arreglar.

## Fuera de alcance (sin cambios, según lo acordado)

- **S7** (timers de progreso 25s/60s/100s desacoplados de la duración real): no tocado. `server.js` no se modificó. Pendiente de decisión del usuario sobre si vale la pena introducir `--include-partial-messages` en el backend para progreso granular real.
- No se recalibraron los timers a 40s/80s/115s.
- `server.js` no se tocó en ningún commit.

## Estado del repositorio

- 7 commits en `fix/auditoria-frontend` (1 baseline + 6 de patches), rama no mergeada a `main`.
- No se abrió pull request. Pendiente de revisión y merge manual por el usuario.
