# Test E2E pendiente con PDF real de LinkedIn

## Contexto
El ciclo de auditoría (commits 672aea0..dde48cd) se validó con un PDF sintético
mínimo generado por `scratchpad/make-test-pdf.mjs`. Antes de dar el frontend por
cerrado con usuarios reales, hay que confirmar que `validateApiShape` y el flujo
NDJSON completo aguantan un PDF de perfil LinkedIn exportado real.

## Cómo ejecutarlo (manual, requiere acción del usuario)

1. En LinkedIn: perfil propio → "Más" → "Guardar como PDF". Guardar en
   `C:\My-proyectos\optimizer-linkedin-noAPI\test-fixtures\linkedin-real.pdf`
   (crear carpeta si no existe; ya está en `.gitignore` para no versionar datos personales).

2. Arrancar backend si no lo está:
```
   cd optimizer-server && node server.js
```

3. Servir el frontend en :8080:
```
   npx http-server . -p 8080
```

4. Abrir `http://localhost:8080/index.html`, subir `linkedin-real.pdf`.

## Criterios de aceptación

- Duración total <180s (margen sobre los 121s del test sintético).
- Dashboard se pinta completo sin errores en consola.
- Ningún `Respuesta del servidor incompleta: falta ...` en pantalla.
- Las 7 tarjetas de score muestran valores; ninguna en 0 o vacía.
- Cada sección (headline, about, experience, featured, skills, recommendations)
  tiene `optimized` con texto, `problems` con al menos 1 ítem, `checklist` con
  al menos 3 ítems.
- El About del `optimized` cumple el mínimo de 300 palabras.

## Si algo falla

- Si `validateApiShape` rechaza el payload: capturar el JSON crudo del backend
  (`server.log` o interceptar con curl) y añadir el campo faltante al informe
  de auditoría.
- Si el dashboard se pinta pero con datos raros (caracteres corruptos, texto
  cortado): es un problema del prompt del backend, no del frontend. Escalar a
  `server.js`, fuera del alcance de esta auditoría.

## Estado
Pendiente. Bloqueado hasta que el usuario proporcione el PDF real.
