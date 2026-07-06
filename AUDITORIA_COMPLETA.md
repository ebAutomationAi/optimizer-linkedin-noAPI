# 📋 **Auditoría Completa: LinkedIn Profile Optimizer (No-API)**

> **Repositorio**: [ebAutomationAi/optimizer-linkedin-noAPI](https://github.com/ebAutomationAi/optimizer-linkedin-noAPI)
> **Fecha**: 6 de julio de 2026
> **Autor**: Vibe (Asistente de Mistral AI)
> **Objetivo**: Documentar el estado actual, problemas, soluciones y hoja de ruta para completar el proyecto.

---

## 📌 **Índice**

1. [📋 Resumen Ejecutivo](#resumen-ejecutivo)
2. [📁 Estado Actual](#estado-actual)
   - [🌐 Frontend (`index.html`)](#frontend-indexhtml)
   - [🖥️ Backend (`optimizer-server/server.js`)](#backend-optimizer-serverserverjs)
3. [⚠️ Problemas Detectados](#problemas-detectados)
   - [🔴 Críticos (Bloquean funcionalidad)](#críticos-bloquean-funcionalidad)
   - [🟡 Advertencias (Mejoras necesarias)](#advertencias-mejoras-necesarias)
   - [🟢 Menores (Mejoras opcionales)](#menores-mejoras-opcionales)
4. [🔧 Soluciones Propuestas](#soluciones-propuestas)
   - [📜 Código para `index.html`](#código-para-indexhtml)
   - [📜 Mejoras para `server.js`](#mejoras-para-serverjs)
   - [📜 `.env.example`](#envexample)
5. [🚀 Hoja de Ruta](#hoja-de-ruta)
6. [📂 Archivos a Modificar/Crear](#archivos-a-modificarcrear)
7. [🎯 Checklist de Implementación](#checklist-de-implementación)
8. [📌 Notas Adicionales](#notas-adicionales)
9. [🤝 Cómo Contribuir](#cómo-contribuir)

---

## 📋 **Resumen Ejecutivo**

Este documento contiene un **análisis exhaustivo** del proyecto **LinkedIn Profile Optimizer (No-API)**, incluyendo:
- ✅ **Estado actual**: Qué funciona y cómo.
- ⚠️ **Problemas detectados**: Bugs, falta de funcionalidades, riesgos de seguridad.
- 🛠️ **Soluciones propuestas**: Código listo para implementar, explicado paso a paso.
- 🚀 **Hoja de ruta**: Prioridades y pasos para completar el proyecto.

**Objetivo**: Que **cualquier desarrollador o IA** pueda entender el proyecto, sus carencias, y cómo completarlo **sin ambigüedades**.

---

## 📁 **Estado Actual**

### **🌐 Frontend (`index.html`)**

#### **✅ Implementado y funcional:**
- **Pantalla de subida (`upload-screen`)**:
  - Diseño de **drag & drop** con estilos alineados al documento.
  - Instrucciones para descargar el PDF de LinkedIn.
  - Validación **visual** (no funcional) para PDF.
  - Nota de privacidad.

- **Pantalla de análisis (`analyzing-screen`)**:
  - **Spinner CSS animado**.
  - **5 pasos estáticos** (sin conexión al backend).
  - Diseño visual correcto (colores, tipografía, bordes).

- **Pantalla de resultados (`results-screen`)**:
  - **Profile strip**: Avatar con iniciales, nombre, rol, chips (seguidores, conexiones, ubicación).
  - **Barra de navegación con 7 tabs**: Estrategia, Titular, About, Experiencia, Destacados, Skills, Recomendaciones.
  - **Barra de progreso global** (diseño implementado, lógica pendiente).
  - **Layout de 2 columnas** para cada sección (estado actual vs. versión optimizada).
  - **Botones de navegación** (Anterior/Siguiente) entre tabs.
  - **Botones "Copiar"** (diseño implementado, funcionalidad pendiente).
  - **Checklists** (diseño implementado, lógica pendiente).

**📌 Diseño visual:**
- Paleta de colores, tipografía, bordes, radios, y estilos **100% alineados** con el documento [LinkedIn Profile Optimizer (1).pdf](https://mistralaichatupprodswe.blob.core.windows.net/chat-documents/18/15/a7/1815a716-121a-4c93-b648-7c3d0ac512dc/5ca64200-15c4-44b4-bc78-e7994e5f2216/8e309b4b-9a82-472e-8a3d-2c67fd40d3cd).

---

### **🖥️ Backend (`optimizer-server/server.js`)**

#### **✅ Implementado y funcional:**
- **Endpoint `/api/analyze`**:
  - Recibe el PDF en `base64` desde el frontend.
  - Guarda el PDF **temporalmente** en el sistema.
  - Ejecuta **Claude Code CLI** con el **prompt exacto** del documento (estructura JSON detallada).
  - Envía **eventos de progreso** al frontend (`started`, `reading_pdf`, `generating`, `tool_result`, `done`).
  - Limpia los archivos temporales después del análisis.

- **Prompt a Claude**:
  - **Estructura JSON completa**: Coincide con el documento (incluye `profile`, `overall_score`, `strategy`, y `sections` con `headline`, `about`, `experience`, `featured`, `skills`, `recommendations`).
  - **Instrucciones críticas**:
    - No inventar datos.
    - Adaptar idioma.
    - Scores de 0-100.
    - Textos optimizados listos para copiar/pegar.

- **Manejo de errores**:
  - Timeout de **5 minutos** para Claude Code CLI.
  - Limpieza de archivos temporales **incluso en caso de error**.

---

## ⚠️ **Problemas Detectados**

### **🔴 Críticos (Bloquean funcionalidad)**

#### **1. Falta de Conexión Frontend-Backend**
- **Problema**: El `index.html` **no tiene código JavaScript** para:
  - Enviar el PDF a `/api/analyze` (usando `fetch`).
  - Recibir y procesar el JSON de respuesta.
  - Actualizar los **5 pasos de análisis** en tiempo real.
  - Poblar los datos en las **7 tabs**.
  - Calcular el **progreso global** (barra de progreso y %).
- **Impacto**: El usuario **no puede usar la herramienta** más allá de la pantalla de subida.

#### **2. Lógica de Navegación entre Tabs no Implementada**
- **Problema**: Los botones **"Anterior"** y **"Siguiente"** llaman a `app.switchTab()`, pero esta función **no existe**.
- **Impacto**: La navegación entre tabs **no funciona**.

#### **3. Funcionalidad de "Copiar" y Checklists no Implementada**
- **Problema**:
  - Los botones **"Copiar"** no tienen lógica para copiar el texto optimizado al portapapeles.
  - Los **checklists** no persisten el estado (marcar/desmarcar) ni actualizan el progreso global.
- **Impacto**: El usuario **no puede interactuar** con los resultados.

#### **4. Manejo de Eventos de Progreso no Conectado**
- **Problema**: El backend envía eventos de progreso (`started`, `reading_pdf`, etc.), pero el frontend **no los escucha ni actualiza la UI**.
- **Impacto**: Los 5 pasos de análisis **permanecen estáticos** (siempre en "pendiente").

---

### **🟡 Advertencias (Mejoras necesarias)**

#### **5. Validación de Archivos en el Frontend**
- **Problema**: La validación de que el archivo es un PDF y no supera 5MB **solo es visual** (no hay lógica en JS).
- **Riesgo**: El usuario podría subir archivos no válidos, causando errores en el backend.

#### **6. Seguridad en el Backend**
- **Problema**: El `server.js` usa `spawn` para ejecutar **Claude Code CLI** con el PDF subido.
  - **Riesgo de inyección de comandos**: Si el `base64Data` no se valida correctamente, un atacante podría inyectar comandos maliciosos.
  - **Riesgo de denegación de servicio**: El timeout de 5 minutos es adecuado, pero no hay límite de tamaño para el PDF (podría saturar el sistema).
- **Solución**: Validar el tamaño y tipo del PDF **antes** de guardarlo en el sistema.

#### **7. Persistencia de Datos en el Frontend**
- **Problema**: Si el usuario recarga la página, **pierde todos los resultados** (no hay almacenamiento en `localStorage` o `sessionStorage`).
- **Impacto**: Experiencia de usuario pobre.

#### **8. Falta de Manejo de Errores en el Frontend**
- **Problema**: No hay feedback visual si:
  - El PDF no es válido.
  - Claude Code CLI falla.
  - El JSON de respuesta está mal formado.
- **Impacto**: El usuario **no sabe qué salió mal**.

#### **9. Diseño Responsivo**
- **Problema**: El diseño **no está optimizado para móviles** (ej: el layout de 2 columnas se rompe en pantallas pequeñas).
- **Impacto**: Experiencia de usuario deficiente en dispositivos móviles.

---

### **🟢 Menores (Mejoras opcionales)**

#### **10. Optimización de Rendimiento**
- **Problema**: El `index.html` tiene **todo el CSS en línea** (no hay división en archivos separados).
- **Impacto**: Dificulta el mantenimiento y la escalabilidad.

#### **11. Internacionalización**
- **Problema**: Los textos de la UI están **hardcodeados en español**.
- **Impacto**: No es fácil adaptar la herramienta a otros idiomas.

#### **12. Pruebas Automatizadas**
- **Problema**: No hay pruebas unitarias ni de integración.
- **Impacto**: Dificulta la detección de regresiones.

---

## 🔧 **Soluciones Propuestas**

### **📁 Archivos a Modificar/Crear**

| **Archivo** | **Acción** | **Descripción** |
|-------------|------------|-----------------|
| `index.html` | Modificar | Añadir bloque `<script>` con lógica de frontend. |
| `optimizer-server/server.js` | Modificar | Añadir validación de PDF y mejorar manejo de errores. |
| `.env.example` | Crear | Plantilla para variables de entorno. |

---

### **📜 Código Propuesto**

#### **1. Bloque `<script>` para `index.html`**

**Ubicación**: Añadir **antes de cerrar `</body>`**.

```javascript
// ============================================
// LinkedIn Profile Optimizer - Frontend Logic
// ============================================

// Objeto global de la aplicación
const app = {
  // Estado de la aplicación
  state: {
    currentScreen: 'upload', // upload | analyzing | results
    currentTab: 'strategy', // strategy | headline | about | experience | featured | skills | recommendations
    analysisData: null, // Datos del JSON de Claude
    progress: {
      currentStep: 0, // 0-5 (pasos de análisis)
      totalSteps: 5,
    },
  },

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================
  init: function() {
    this.setupEventListeners();
    this.loadSavedData();
  },

  // ==========================================
  // CONFIGURACIÓN DE EVENT LISTENERS
  // ==========================================
  setupEventListeners: function() {
    // Drag & Drop
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('hover');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('hover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('hover');
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        this.handleFileUpload();
      }
    });
    fileInput.addEventListener('change', () => this.handleFileUpload());

    // Botón de restart
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => window.location.reload());
    }

    // Navegación entre tabs
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
  },

  // ==========================================
  // MANEJO DE SUBIDA DE ARCHIVO
  // ==========================================
  handleFileUpload: function() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    const errorElement = document.getElementById('upload-error');

    // Validar archivo
    if (!file) return;

    // Validar tipo (PDF)
    if (file.type !== 'application/pdf') {
      errorElement.textContent = 'Solo se permiten archivos PDF.';
      errorElement.style.display = 'block';
      return;
    }

    // Validar tamaño (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      errorElement.textContent = 'El archivo debe ser menor a 5MB.';
      errorElement.style.display = 'block';
      return;
    }

    errorElement.style.display = 'none';
    this.switchScreen('analyzing');

    // Convertir PDF a base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1];
      this.analyzePDF(base64Data);
    };
    reader.readAsDataURL(file);
  },

  // ==========================================
  // ANÁLISIS DEL PDF (LLAMADA AL BACKEND)
  // ==========================================
  analyzePDF: async function(base64Data) {
    try {
      const response = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.statusText}`);
      }

      // Leer stream de eventos (NDJSON)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          this.handleAnalysisEvent(event);
        }
      }
    } catch (error) {
      console.error('Error al analizar el PDF:', error);
      this.showError('Error al analizar el perfil. Inténtalo de nuevo.');
      this.switchScreen('upload');
    }
  },

  // ==========================================
  // MANEJO DE EVENTOS DEL BACKEND
  // ==========================================
  handleAnalysisEvent: function(event) {
    if (event.type === 'progress') {
      this.updateAnalysisStep(event.step);
    } else if (event.type === 'done') {
      this.state.analysisData = event.data;
      this.saveData();
      this.populateResults();
      this.switchScreen('results');
      this.updateGlobalProgress();
    } else if (event.type === 'error') {
      this.showError(event.message);
      this.switchScreen('upload');
    }
  },

  // ==========================================
  // ACTUALIZAR PASOS DE ANÁLISIS
  // ==========================================
  updateAnalysisStep: function(step) {
    const steps = ['started', 'reading_pdf', 'generating', 'tool_result', 'done'];
    const stepIndex = steps.indexOf(step);

    if (stepIndex >= 0) {
      for (let i = 0; i <= stepIndex; i++) {
        const stepElement = document.getElementById(`step-${i + 1}`);
        if (stepElement) {
          stepElement.classList.remove('pending', 'active');
          stepElement.classList.add('completed');
        }
      }
      if (stepIndex < steps.length - 1 && stepIndex + 2 <= steps.length) {
        const nextStepElement = document.getElementById(`step-${stepIndex + 2}`);
        if (nextStepElement) {
          nextStepElement.classList.remove('pending', 'completed');
          nextStepElement.classList.add('active');
        }
      }
    }
  },

  // ==========================================
  // POBLAR RESULTADOS EN LAS TABS
  // ==========================================
  populateResults: function() {
    const data = this.state.analysisData;
    if (!data) return;

    // Profile strip
    if (data.profile) {
      document.getElementById('profile-avatar').textContent = data.profile.initials || '?';
      document.getElementById('profile-name').textContent = data.profile.name || 'Desconocido';
      document.getElementById('profile-role').textContent = data.profile.role || 'Sin rol';
      if (data.profile.followers) document.getElementById('chip-followers').textContent = data.profile.followers;
      if (data.profile.connections) document.getElementById('chip-connections').textContent = data.profile.connections;
      if (data.profile.location) document.getElementById('chip-location').textContent = data.profile.location;
      document.getElementById('global-score-num').textContent = data.overall_score || '0';
    }

    // Pestaña Estrategia
    if (data.strategy) {
      document.getElementById('strat-objective').textContent = data.strategy.objective || 'No especificado';
      document.getElementById('strat-icp').textContent = data.strategy.icp || 'No especificado';
      document.getElementById('strat-mechanism').textContent = data.strategy.mechanism || 'No especificado';
      document.getElementById('strat-cta').textContent = data.strategy.cta_current || 'No especificado';
      this.populateList('strat-gaps', data.strategy.gaps);
      this.populateList('strat-strengths', data.strategy.strengths);
    }

    // Secciones (headline, about, etc.)
    const sections = ['headline', 'about', 'experience', 'featured', 'skills', 'recommendations'];
    sections.forEach(section => {
      if (data.sections && data.sections[section]) {
        const sec = data.sections[section];
        document.getElementById(`current-${section}`).textContent = sec.current || 'No disponible';
        this.populateList(`problems-${section}`, sec.problems);
        document.getElementById(`optimized-${section}`).textContent = sec.optimized || 'No disponible';
        if (section === 'headline' && sec.optimized_chars) {
          document.getElementById('count-headline').textContent = `${sec.optimized_chars} caracteres`;
        }
        this.populateList(`why-${section}`, sec.why);
        this.populateChecklist(`checklist-${section}`, sec.checklist);
      }
    });

    // Grid de scores
    this.populateScoreGrid(data.sections);
  },

  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================
  populateList: function(elementId, items) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<li>No hay elementos para mostrar.</li>';
      return;
    }
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      container.appendChild(li);
    });
  },

  populateChecklist: function(elementId, items) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<p>No hay acciones para esta sección.</p>';
      return;
    }
    items.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'checklist-item';
      div.innerHTML = `
        <input type="checkbox" id="${elementId}-${index}" onchange="app.updateGlobalProgress()">
        <span class="checklist-item-text">${item}</span>
      `;
      container.appendChild(div);
    });
  },

  populateScoreGrid: function(sections) {
    const container = document.getElementById('grid-score-container');
    if (!container) return;
    container.innerHTML = '';
    if (!sections) return;

    const sectionNames = {
      headline: 'Titular', about: 'About', experience: 'Experiencia',
      featured: 'Destacados', skills: 'Skills', recommendations: 'Recomendaciones'
    };

    Object.entries(sections).forEach(([key, sec]) => {
      if (sec.score !== undefined) {
        const card = document.createElement('div');
        card.className = `score-card score-${this.getScoreColor(sec.score)}`;
        card.innerHTML = `
          <h4>${sectionNames[key] || key}</h4>
          <div class="score-value">${sec.score}</div>
          <span class="score-badge-text">${sec.badge || 'Desconocido'}</span>
        `;
        container.appendChild(card);
      }
    });
  },

  getScoreColor: function(score) {
    if (score >= 70) return 'green';
    if (score >= 50) return 'yellow';
    return 'red';
  },

  // ==========================================
  // NAVEGACIÓN
  // ==========================================
  switchScreen: function(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(`${screenName}-screen`).classList.add('active');
    this.state.currentScreen = screenName;
  },

  switchTab: function(tabName) {
    this.saveData();
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    this.state.currentTab = tabName;
  },

  // ==========================================
  // PROGRESO GLOBAL
  // ==========================================
  updateGlobalProgress: function() {
    const totalChecks = document.querySelectorAll('.checklist-item input[type="checkbox"]').length;
    const checkedChecks = document.querySelectorAll('.checklist-item input[type="checkbox"]:checked').length;
    const progress = totalChecks > 0 ? Math.round((checkedChecks / totalChecks) * 100) : 0;
    document.getElementById('global-progress-bar').style.width = `${progress}%`;
    document.getElementById('global-progress-percent').textContent = `${progress}%`;
  },

  // ==========================================
  // COPIAR TEXTO
  // ==========================================
  copyText: function(elementId, button) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
      button.textContent = '¡Copiado!';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = 'Copiar';
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Error al copiar:', err);
      button.textContent = 'Error';
      setTimeout(() => { button.textContent = 'Copiar'; }, 2000);
    });
  },

  // ==========================================
  // GESTIÓN DE DATOS
  // ==========================================
  saveData: function() {
    if (this.state.analysisData) {
      localStorage.setItem('optimizerAnalysisData', JSON.stringify(this.state.analysisData));
    }
    localStorage.setItem('optimizerState', JSON.stringify(this.state));
  },

  loadSavedData: function() {
    const savedState = localStorage.getItem('optimizerState');
    const savedData = localStorage.getItem('optimizerAnalysisData');
    if (savedState) this.state = { ...this.state, ...JSON.parse(savedState) };
    if (savedData) {
      this.state.analysisData = JSON.parse(savedData);
      this.populateResults();
      this.switchScreen('results');
      this.updateGlobalProgress();
    }
  },

  // ==========================================
  // ERROR
  // ==========================================
  showError: function(message) {
    const errorElement = document.getElementById('upload-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  },
};

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => app.init());
```

---

#### **2. Mejoras para `optimizer-server/server.js`**

**Modificaciones clave:**

```javascript
// Añadir al inicio (después de las dependencias)
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

// Modificar el endpoint /api/analyze
app.post('/api/analyze', async (req, res) => {
  const { base64Data } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: 'Falta el PDF (base64Data).' });
  }

  // Validar tamaño del base64
  const bufferSize = Buffer.byteLength(base64Data, 'base64');
  if (bufferSize > FILE_SIZE_LIMIT) {
    return res.status(400).json({ error: 'El archivo debe ser menor a 5MB.' });
  }

  // Validar que es un PDF (magic number)
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const header = buffer.toString('ascii', 0, 4);
    if (header !== '%PDF') {
      return res.status(400).json({ error: 'El archivo no es un PDF válido.' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'Formato de PDF inválido.' });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizer-'));
  const pdfPath = path.join(tmpDir, 'perfil.pdf');

  try {
    fs.writeFileSync(pdfPath, Buffer.from(base64Data, 'base64'));
    const stats = fs.statSync(pdfPath);
    if (stats.size > FILE_SIZE_LIMIT) {
      throw new Error('El archivo supera el límite de tamaño (5MB).');
    }

    const resultText = await runClaude(pdfPath, (progress) => 
      res.write(`${JSON.stringify({ type: 'progress', ...progress })}\n`)
    );
    const rawText = resultText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(rawText);
    res.write(`${JSON.stringify({ type: 'done', data: parsed })}\n`);
  } catch (err) {
    console.error(`[analyze] error: ${err.message}`);
    res.write(`${JSON.stringify({ type: 'error', message: err.message })}\n`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    res.end();
  }
});
```

---

#### **3. `.env.example` - Plantilla para Variables de Entorno**

```env
# Puerto del servidor
PORT=3001

# Timeout para Claude Code CLI (milisegundos)
CLAUDE_TIMEOUT_MS=300000

# Límite de tamaño de archivo (bytes)
MAX_FILE_SIZE=5242880
```

---

## 🚀 **Hoja de Ruta**

### **📌 Fase 1: Funcionalidad Básica (Prioridad Alta - 7h)**

| **Tarea** | **Archivo** | **Esfuerzo** | **Dependencias** |
|-----------|------------|--------------|------------------|
| Añadir bloque `<script>` al `index.html` | `index.html` | 2h | Ninguna |
| Implementar `fetch` a `/api/analyze` | `index.html` | 1h | Backend funcionando |
| Implementar `handleAnalysisEvent` y `updateAnalysisStep` | `index.html` | 1h | Backend funcionando |
| Implementar `populateResults` | `index.html` | 2h | JSON del backend |
| Implementar navegación entre tabs (`switchTab`) | `index.html` | 1h | Ninguna |

---

### **📌 Fase 2: Mejoras de Usabilidad (Prioridad Media - 3h)**

| **Tarea** | **Archivo** | **Esfuerzo** | **Dependencias** |
|-----------|------------|--------------|------------------|
| Implementar `copyText` | `index.html` | 0.5h | API de Clipboard |
| Implementar `updateGlobalProgress` | `index.html` | 1h | Checklists funcionando |
| Añadir validación de PDF en el frontend | `index.html` | 0.5h | Ninguna |
| Implementar `saveData` y `loadSavedData` | `index.html` | 1h | localStorage |

---

### **📌 Fase 3: Seguridad y Robustez (Prioridad Media - 2h)**

| **Tarea** | **Archivo** | **Esfuerzo** | **Dependencias** |
|-----------|------------|--------------|------------------|
| Validar tamaño y tipo de PDF en el backend | `server.js` | 1h | Ninguna |
| Añadir middleware para limitar tamaño del body | `server.js` | 0.5h | `express` |
| Crear `.env.example` | `.env.example` | 0.5h | Ninguna |

---

### **📌 Fase 4: Mejoras Opcionales (Prioridad Baja - 7h)**

| **Tarea** | **Archivo** | **Esfuerzo** | **Dependencias** |
|-----------|------------|--------------|------------------|
| Separar CSS en archivo externo | `styles.css` | 1h | Ninguna |
| Añadir internacionalización (i18n) | `i18n.js` | 2h | Ninguna |
| Añadir pruebas unitarias | `tests/` | 3h | `jest` |
| Optimizar diseño para móviles | `index.html` | 1h | Ninguna |

---

## 📂 **Archivos a Modificar/Crear**

| **Archivo** | **Acción** | **Descripción** |
|-------------|------------|-----------------|
| `index.html` | Modificar | Añadir bloque `<script>` con lógica de frontend. |
| `optimizer-server/server.js` | Modificar | Añadir validación de PDF y mejorar manejo de errores. |
| `.env.example` | Crear | Plantilla para variables de entorno. |

---

## 🎯 **Checklist de Implementación**

### **Frontend**
- [ ] Añadir bloque `<script>` al `index.html`.
- [ ] Probar subida de PDF y actualización de pasos de análisis.
- [ ] Probar que los resultados se muestran en todas las tabs.
- [ ] Probar navegación entre tabs.
- [ ] Probar funcionalidad de "Copiar".
- [ ] Probar actualización del progreso global.
- [ ] Probar persistencia de datos al recargar.
- [ ] Probar manejo de errores.

### **Backend**
- [ ] Añadir validación de PDF en `server.js`.
- [ ] Probar con PDFs válidos e inválidos.
- [ ] Probar con PDFs de diferentes tamaños.
- [ ] Verificar limpieza de archivos temporales.

### **Seguridad**
- [ ] Validar que no hay inyección de comandos.
- [ ] Verificar límite de tamaño de archivo.
- [ ] Probar con entradas maliciosas.

---

## 📌 **Notas Adicionales**

### **Requisitos Previos**
1. **Claude Code CLI**: Debe estar instalado y configurado en el sistema donde se ejecuta el servidor.
   - Instalación: Seguir las instrucciones oficiales de Anthropic.
2. **Node.js 18+**: Requerido para `fetch` y módulos ES.
3. **Dependencias**: Ejecutar `npm install` en el directorio `optimizer-server` para instalar `express` y `cors`.

---

### **Ejecución del Proyecto**

#### **Backend**
```bash
cd optimizer-server
npm install
node server.js
```
- El servidor estará disponible en `http://localhost:3001`.

#### **Frontend**
- Abrir `index.html` en un navegador.
- **Recomendación**: Usar un servidor local para evitar problemas con CORS:
  ```bash
  python -m http.server 8000
  ```

---

### **Pruebas Recomendadas**

1. **PDF válido**:
   - Subir un PDF de perfil de LinkedIn real.
   - Verificar que:
     - Los pasos de análisis se actualizan.
     - Los resultados se muestran correctamente en todas las tabs.
     - El progreso global se calcula al marcar checkboxes.

2. **PDF inválido**:
   - Subir un archivo que no sea PDF.
   - Verificar que se muestra un error claro.

3. **PDF demasiado grande**:
   - Subir un PDF >5MB.
   - Verificar que se muestra un error claro.

4. **Navegación**:
   - Verificar que:
     - Los botones "Anterior" y "Siguiente" funcionan.
     - Las tabs se cambian correctamente.
     - El botón "Analizar otro perfil" reinicia la app.

5. **Persistencia**:
   - Recargar la página y verificar que los resultados se mantienen.

---

## 🤝 **Cómo Contribuir**

1. **Forkear el repositorio** y crear una rama basada en `main`.
2. **Implementar los cambios** según la hoja de ruta.
3. **Probar exhaustivamente** cada funcionalidad añadida.
4. **Hacer commit** de los cambios con mensajes descriptivos.
5. **Abrir un Pull Request** hacia `main` con una descripción clara de los cambios.

---

## 📄 **Documentación de Referencia**

- [Prompt Definitivo - LinkedIn Profile Optimizer](https://mistralaichatupprodswe.blob.core.windows.net/chat-documents/18/15/a7/1815a716-121a-4c93-b648-7c3d0ac512dc/5ca64200-15c4-44b4-bc78-e7994e5f2216/8e309b4b-9a82-472e-8a3d-2c67fd40d3cd)
- [LinkedIn Content OS (React)](https://mistralaichatupprodswe.blob.core.windows.net/chat-documents/18/15/a7/1815a716-121a-4c93-b648-7c3d0ac512dc/5ca64200-15c4-44b4-bc78-e7994e5f2216/f86ba8f5-0487-4b18-8333-7a44f20fc0be)

---

## 📢 **Conclusión**

Este documento proporciona **toda la información necesaria** para:
1. **Entender el estado actual** del proyecto.
2. **Identificar los problemas** que deben resolverse.
3. **Implementar las soluciones** con código listo para usar.
4. **Seguir una hoja de ruta clara** para completar el proyecto.

**🚀 El objetivo final es que el proyecto esté 100% funcional y listo para producción.**

---

> **¿Preguntas o aclaraciones?** Abre un **Issue** en el repositorio o contacta al mantenedor.
