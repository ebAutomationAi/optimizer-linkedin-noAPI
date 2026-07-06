Contexto de continuidad — Optimizer LinkedIn (versión suscripción)
Proyecto

* Ruta: `C:\My-proyectos\optimizer-linkedin-noAPI`
* Propósito: analizar perfiles de LinkedIn exportados como PDF y generar un dashboard con puntuaciones y texto optimizado por sección.
* Stack: `index.html` (single-file, vanilla JS) + `optimizer-server/server.js` (Express, Node.js 22.14.0).
* Autenticación: CLI de Claude vía sesión de suscripción Pro/Max (NO API key). Existe una versión paralela con API key en otra carpeta, proyecto separado.

Arquitectura del flujo

frontend (index.html)
  → POST /api/analyze con base64Data
  → server.js escribe PDF a tmpdir
  → spawn('claude', [...]) con --add-dir y herramienta Read
  → NDJSON streaming de vuelta al frontend
  → dashboard de resultados

Estado del repositorio
Rama `main` con 10 commits. Historial relevante:

* `0158932` — baseline git init
* `672aea0` — S3: AbortController 320s
* `176133e` — S4: validateApiShape
* `edd3885` — S5: guard inFlight
* `9c2231b` — S1+S2: NDJSON robusto
* `dd80659` — S6: URL backend configurable
* `dde48cd` — sessionStorage selectivo
* `07698b4` — S7 documentado como pendiente
* `76bddce` — comentario OPTIMIZER_BACKEND_URL
* `82dea58` — TEST-E2E-PDF-REAL.md
* `52f28b0` — S7: timers recalibrados a 35s/65s/95s

Ciclos de trabajo completados

1. Auditoría frontend — 6 bugs confirmados con evidencia reproducible (S1-S6), todos aplicados y mergeados.
2. S7 timers — aplicado en `52f28b0` (35000ms / 65000ms / 95000ms). Cerrado.
3. Benchmark de modelo — `scratchpad/bench-modelo.mjs` ejecutado con PDF real (`test-fixtures/linkedin-real.pdf`) en serie sin concurrencia:

| Modelo | Effort | Tiempo (s) | Palabras About | ≥300 | JSON válido | Shape completa |
|---|---|---|---|---|---|---|
| claude-sonnet-4-6 | low | 138.5 | 329 | ✅ | ✅ | ✅ |
| claude-haiku-4-5 | medium | 150.2 | 491 | ✅ | ✅ | ✅ |

   Decisión: mantener `claude-sonnet-4-6 + --effort low`. Haiku descartado por ser 11.7s más lento (+8.4%).

4. Test E2E con PDF real — completado. Criterios superados:
   * Duración: 142s (límite 180s) ✅
   * Dashboard completo sin errores en consola ✅
   * Sin mensaje `Respuesta del servidor incompleta` ✅
   * `error: false` en servidor ✅

Config activa en producción

* Modelo: `claude-sonnet-4-6`
* Effort: `low`
* Duración real observada: ~138-142s end-to-end
* Timers de progreso: 35000ms / 65000ms / 95000ms (cubren la duración real)
* TIMEOUT_MS backend: 300000ms
* CLIENT_TIMEOUT_MS frontend: 320000ms

Pendientes conocidos

Ninguno activo. El proyecto está en estado production-ready para uso local.

Posibles mejoras futuras (no bloqueantes, sin decisión tomada):
* Progreso granular real vía `--include-partial-messages` en `server.js` (requiere modificar contrato NDJSON y añadir throttling en frontend — arquitectura no trivial).

Entorno

* Windows 11 Pro + WSL2 Ubuntu (desarrollo).
* Orange Pi 5 Max ARM64 (producción futura, no activo en este proyecto todavía).
* Servidor en producción local: `localhost:3001`.
* Frontend servido en `:8080` para pruebas.

Reglas de este proyecto

* No tocar `server.js` sin datos del benchmark que justifiquen el cambio.
* No migrar de CLI a SDK (diferencia de modelo de facturación).
* No generar PDFs sintéticos para tests: usar siempre `test-fixtures/linkedin-real.pdf`.
* Commits atómicos, mensajes en imperativo español con prefijo convencional.
* No abrir PRs. El usuario revisa y mergea manualmente.

Archivos de referencia en el repo
* CHANGELOG-auditoria.md — historial detallado de patches S1-S7
* TEST-E2E-PDF-REAL.md — procedimiento de test E2E con PDF real
* scratchpad/bench-results-real-pdf.ndjson — resultados del benchmark de modelo