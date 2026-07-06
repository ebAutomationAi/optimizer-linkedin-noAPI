// Banco de pruebas AISLADO para medir tiempo end-to-end del CLI de Claude
// con distintas combinaciones de --model/--effort, usando el PDF REAL del
// usuario (test-fixtures/linkedin-real.pdf) y replicando EXACTAMENTE los
// mismos argumentos de spawn() y el mismo prompt que usa server.js
// (optimizer-server/server.js, función runClaude, líneas 110-129, leído
// literalmente el 2026-07-06, sin reconstruir de memoria).
//
// No modifica server.js. No usa API key: fuerza la sesión de suscripción
// borrando ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN del entorno del hijo,
// igual que hace server.js.
//
// Uso:
//   node scratchpad/bench-modelo.mjs sonnet-4-6 low
//   node scratchpad/bench-modelo.mjs haiku-4-5 medium

import { spawn } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REAL_PDF_PATH = path.join(PROJECT_ROOT, 'test-fixtures', 'linkedin-real.pdf');

// ---- Copiado LITERAL de optimizer-server/server.js (líneas 13-108) ----

const PROMPT_TEMPLATE = `Eres un experto de clase mundial en optimización de perfiles de LinkedIn con enfoque en conversión B2B.
Analiza el perfil de LinkedIn del PDF adjunto y devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta (sin markdown, sin backticks, solo el JSON):
{
"profile": {
"name": "Nombre completo",
"initials": "NF",
"headline_current": "Titular actual del perfil",
"role": "Rol principal y empresa",
"followers": "X.XXX seguidores (si se menciona, si no null)",
"connections": "500+ contactos (si se menciona, si no null)",
"location": "Ciudad, País"
},
"overall_score": 62,
"strategy": {
"objective": "qué busca esta persona en LinkedIn (ventas/empleo/autoridad/leads)",
"icp": "a quién va dirigido el perfil",
"mechanism": "cómo genera clientes u oportunidades actualmente",
"cta_current": "cuál es el CTA actual del perfil",
"gaps": ["gap estratégico 1", "gap estratégico 2", "gap estratégico 3"],
"strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"]
},
"sections": {
"headline": {
"score": 55,
"badge": "Mejorable",
"current": "Titular actual completo copiado del perfil",
"char_count": 120,
"problems": ["problema específico 1", "problema específico 2", "problema específico 3", "problema específico 4"],
"optimized": "Nueva versión optimizada del titular con keywords SEO relevantes para su sector, prueba social con número concreto y CTA claro. Máximo 220 caracteres.",
"optimized_chars": 145,
"why": ["razón técnica 1 de por qué funciona", "razón 2", "razón 3", "razón 4"],
"checklist": ["acción concreta 1", "acción concreta 2", "acción concreta 3", "acción concreta 4"]
},
"about": {
"score": 50,
"badge": "Mejorable",
"current": "Primeras 2-3 líneas del About actual tal como aparece en el perfil",
"problems": ["problema 1", "problema 2", "problema 3", "problema 4"],
"optimized": "Versión COMPLETA y optimizada del About. Estructura obligatoria: (1) Hook con pregunta directa al dolor del ICP, (2) Solución en 1-2 líneas, (3) Prueba social con números reales o estimados, (4) Sistema de pasos numerados 1→N, (5) CTA único al final. Mínimo 300 palabras. Listo para copiar y pegar directamente en LinkedIn.",
"why": ["razón 1", "razón 2", "razón 3", "razón 4"],
"checklist": ["acción 1", "acción 2", "acción 3", "acción 4"]
},
"experience": {
"score": 45,
"badge": "Mejorable",
"current": "Descripción actual del rol principal tal como aparece",
"problems": ["problema 1", "problema 2", "problema 3", "problema 4"],
"optimized": "Descripción optimizada del rol principal con: empresa + especialización, resultados con métricas concretas (→ formato), proceso o metodología propia numerada, keywords relevantes al final. Lista para copiar.",
"why": ["razón 1", "razón 2", "razón 3", "razón 4"],
"checklist": ["acción 1", "acción 2", "acción 3", "acción 4"]
},
"featured": {
"score": 40,
"badge": "Revisar",
"current": "Descripción de los destacados actuales, o 'Sin destacados configurados' si no hay ninguno",
"problems": ["problema 1", "problema 2", "problema 3", "problema 4"],
"optimized": "Orden óptimo de los 5 destacados recomendados con emoji numerado (1⃣2⃣3⃣4⃣5⃣) y descripción de cada uno: tipo de recurso + título + propósito de conversión.",
"why": ["razón 1", "razón 2", "razón 3", "razón 4"],
"checklist": ["acción 1", "acción 2", "acción 3", "acción 4"]
},
"skills": {
"score": 50,
"badge": "Optimizar",
"current": "Top skills actuales: skill1 · skill2 · skill3",
"problems": ["problema 1", "problema 2", "problema 3", "problema 4"],
"optimized": "Top 3 recomendado:\\n1. Skill principal (mantener/nueva)\\n2. Skill secundaria (mantener/nueva)\\n3. Skill diferenciadora (mantener/nueva)\\n\\nEliminar o bajar:\\n— skill X (razón)\\n— skill Y (razón)\\n\\nKeywords adicionales a añadir:\\n→ keyword 1\\n→ keyword 2\\n→ keyword 3",
"why": ["razón 1", "razón 2", "razón 3", "razón 4"],
"checklist": ["acción 1", "acción 2", "acción 3", "acción 4"]
},
"recommendations": {
"score": 55,
"badge": "Revisar",
"badgeOk": false,
"current": "Descripción de las recomendaciones actuales: número total, quién las da, qué mencionan. O 'Sin recomendaciones visibles' si no hay.",
"problems": ["problema 1", "problema 2", "problema 3", "problema 4"],
"optimized": "Guión personalizado y completo para pedir recomendaciones a clientes o colaboradores, adaptado al sector y objetivo de esta persona. Formato: saludo → contexto → 3 preguntas guía específicas → cierre. Listo para enviar por DM o email.",
"why": ["razón 1", "razón 2", "razón 3", "razón 4"],
"checklist": ["acción 1", "acción 2", "acción 3", "acción 4"]
}
}
}
INSTRUCCIONES CRÍTICAS:
- Analiza ÚNICAMENTE el perfil real del PDF adjunto. No inventes ni supongas datos.
- Los campos "optimized" deben ser textos COMPLETOS listos para copiar y pegar, personalizados para el sector, idioma y objetivo de esta persona concreta.
- El About optimizado debe tener mínimo 300 palabras con la estructura indicada.
- Los scores van de 0 a 100. Sé honesto, específico y diferenciador entre secciones.
- Adapta el idioma de todos los textos optimizados al idioma del perfil (español, inglés u otro).
- Devuelve SOLO el JSON. Sin texto introductorio, sin explicaciones, sin backticks, sin markdown. Solo el objeto JSON.`;

const DISALLOWED_TOOLS = [
    'Bash', 'PowerShell', 'Write', 'Edit', 'NotebookEdit', 'WebFetch', 'WebSearch',
    'Task', 'Skill', 'Artifact', 'TodoWrite', 'ToolSearch', 'Monitor',
    'CronCreate', 'CronDelete', 'CronList', 'RemoteTrigger', 'SendMessage',
    'PushNotification', 'DesignSync', 'EnterWorktree', 'ExitWorktree',
    'ScheduleWakeup', 'TaskOutput', 'TaskStop', 'ReportFindings'
].join(',');

const TIMEOUT_MS = 300000;

// ---- Mapeo de nombres cortos de CLI a nombres de modelo del CLI ----
// Verificado en vivo (2026-07-06): `env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN
// claude -p "responde solo con OK" --model claude-haiku-4-5 --output-format
// stream-json --verbose` devuelve en el evento system/init "model":"claude-haiku-4-5"
// (se resuelve tal cual, no es un alias de otra cosa). `claude --help` no lista
// "haiku" explícitamente entre los ejemplos de alias (solo cita fable/opus/sonnet),
// por eso se verificó con una invocación real en vez de asumir el string.
const MODEL_MAP = {
    'sonnet-4-6': 'claude-sonnet-4-6',
    'haiku-4-5': 'claude-haiku-4-5',
};

// ---- Validación de shape, replica de validateApiShape() en index.html ----
function validateApiShape(data) {
    if (!data.profile) return 'profile';
    if (typeof data.overall_score !== 'number') return 'overall_score';

    if (!data.strategy) return 'strategy';
    for (const key of ['objective', 'icp', 'mechanism', 'cta_current', 'gaps', 'strengths']) {
        if (data.strategy[key] === undefined || data.strategy[key] === null) return `strategy.${key}`;
    }
    if (!Array.isArray(data.strategy.gaps)) return 'strategy.gaps';
    if (!Array.isArray(data.strategy.strengths)) return 'strategy.strengths';

    if (!data.sections) return 'sections';
    const sectionKeys = ['headline', 'about', 'experience', 'featured', 'skills', 'recommendations'];
    for (const secKey of sectionKeys) {
        const sec = data.sections[secKey];
        if (!sec) return `sections.${secKey}`;
        for (const field of ['score', 'badge', 'current', 'problems', 'optimized', 'why', 'checklist']) {
            if (sec[field] === undefined || sec[field] === null) return `sections.${secKey}.${field}`;
        }
        if (!Array.isArray(sec.problems)) return `sections.${secKey}.problems`;
        if (!Array.isArray(sec.why)) return `sections.${secKey}.why`;
        if (!Array.isArray(sec.checklist)) return `sections.${secKey}.checklist`;
    }

    return null;
}

function countWords(str) {
    return str.split(/\s+/).filter(w => w.length > 0).length;
}

function runClaude(pdfPath, model, effort) {
    // Prompt construido exactamente igual que server.js:111
    const prompt = `Lee el archivo PDF en "${pdfPath}" con la herramienta Read UNA SOLA VEZ (no lo releas ni pidas páginas adicionales) y analiza el perfil de LinkedIn que contiene. No tienes acceso a herramientas de terminal: cuenta caracteres y palabras mentalmente, sin ejecutar comandos. En cuanto tengas el contenido del PDF, escribe directamente el JSON final sin pasos intermedios.\n\n${PROMPT_TEMPLATE}`;

    // childEnv exactamente igual que server.js:115-117
    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;
    delete childEnv.ANTHROPIC_AUTH_TOKEN;

    return new Promise((resolve, reject) => {
        const t0 = performance.now();

        // Array de spawn exactamente igual que server.js:120-129,
        // sustituyendo solo --model y --effort por los argumentos recibidos.
        const child = spawn('claude', [
            '-p', prompt,
            '--model', model,
            '--effort', effort,
            '--output-format', 'stream-json',
            '--verbose',
            '--setting-sources', '',
            '--disallowedTools', DISALLOWED_TOOLS,
            '--add-dir', path.dirname(pdfPath)
        ], { env: childEnv });

        let finalEvent = null;
        let stderrBuf = '';
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill('SIGKILL');
            reject(new Error(`Timeout: Claude Code no terminó en ${TIMEOUT_MS / 1000}s, se ha detenido el proceso.`));
        }, TIMEOUT_MS);

        const rl = readline.createInterface({ input: child.stdout });

        // Mismo criterio que server.js:144-173 para detectar el resultado final:
        // el evento con type === 'result' (no una búsqueda de línea con heurística
        // de texto; el CLI ya delimita el resultado final como un evento propio).
        rl.on('line', (line) => {
            if (!line.trim()) return;
            let event;
            try {
                event = JSON.parse(line);
            } catch {
                return;
            }

            if (event.type === 'system' && event.subtype === 'init') {
                console.log(`  [+${((performance.now() - t0) / 1000).toFixed(1)}s] sesión iniciada (modelo resuelto: ${event.model})`);
            } else if (event.type === 'assistant') {
                for (const block of event.message?.content || []) {
                    if (block.type === 'tool_use') {
                        console.log(`  [+${((performance.now() - t0) / 1000).toFixed(1)}s] usando herramienta: ${block.name}`);
                    } else if (block.type === 'text' && block.text) {
                        console.log(`  [+${((performance.now() - t0) / 1000).toFixed(1)}s] redactando respuesta...`);
                    }
                }
            } else if (event.type === 'user') {
                console.log(`  [+${((performance.now() - t0) / 1000).toFixed(1)}s] resultado de herramienta recibido`);
            } else if (event.type === 'result') {
                console.log(`  [+${((performance.now() - t0) / 1000).toFixed(1)}s] evento result recibido (is_error: ${event.is_error})`);
                finalEvent = event;
            }
        });

        child.stderr.on('data', (d) => {
            stderrBuf += d.toString();
        });

        child.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            const elapsedSec = (performance.now() - t0) / 1000;

            if (!finalEvent) {
                return reject(new Error(stderrBuf || `Claude Code terminó con código ${code} sin devolver resultado.`));
            }
            if (finalEvent.is_error) {
                return reject(new Error(finalEvent.result || 'Error ejecutando Claude Code'));
            }
            resolve({ resultText: finalEvent.result, elapsedSec });
        });

        child.on('error', (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function main() {
    const [, , modelArg, effortArg] = process.argv;
    if (!modelArg || !effortArg) {
        console.error('Uso: node bench-modelo.mjs <modelo> <effort>');
        console.error('  modelos válidos:', Object.keys(MODEL_MAP).join(', '));
        process.exit(1);
    }

    if (!fs.existsSync(REAL_PDF_PATH)) {
        console.error('\nNo se encontró el PDF real en:', REAL_PDF_PATH);
        console.error('Coloca tu PDF exportado de LinkedIn en test-fixtures\\linkedin-real.pdf y vuelve a ejecutar.');
        process.exit(1);
    }

    const model = MODEL_MAP[modelArg] || modelArg;
    const effort = effortArg;

    // Copia del PDF real a un tmpdir propio, igual que hace server.js con
    // fs.mkdtempSync + pdfPath, para no contaminar test-fixtures/.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizer-bench-'));
    const pdfPath = path.join(tmpDir, 'perfil.pdf');
    fs.copyFileSync(REAL_PDF_PATH, pdfPath);

    console.log(`\n=== Benchmark: modelo=${model} effort=${effort} ===`);
    console.log('PDF real:', REAL_PDF_PATH, `(${fs.statSync(REAL_PDF_PATH).size} bytes)`);
    console.log('Copiado a:', pdfPath);

    let result;
    try {
        const { resultText, elapsedSec } = await runClaude(pdfPath, model, effort);

        let jsonValido = true;
        let parsed = null;
        let parseError = null;
        try {
            // Misma limpieza/parseo que server.js:226-227
            const rawText = resultText.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(rawText);
        } catch (err) {
            jsonValido = false;
            parseError = err.message;
        }

        const aboutWords = parsed ? countWords(parsed.sections?.about?.optimized || '') : 0;
        const cumple300 = aboutWords >= 300;
        const missingField = parsed ? validateApiShape(parsed) : 'N/A (JSON inválido)';

        result = {
            modelArg, effortArg, model, effort,
            tiempoSegundos: Number(elapsedSec.toFixed(1)),
            palabrasAbout: aboutWords,
            cumple300,
            jsonValido,
            parseError,
            shapeCompleta: parsed ? missingField === null : false,
            campoFaltante: parsed ? missingField : null,
            fallo: null,
        };

        if (parsed) {
            const outJsonPath = path.join(__dirname, `bench-result-${modelArg}-${effortArg}.json`);
            fs.writeFileSync(outJsonPath, JSON.stringify(parsed, null, 2));
            console.log('Resultado completo guardado en:', outJsonPath);
        }
    } catch (err) {
        result = {
            modelArg, effortArg, model, effort,
            tiempoSegundos: null,
            palabrasAbout: null,
            cumple300: null,
            jsonValido: null,
            parseError: null,
            shapeCompleta: null,
            campoFaltante: null,
            fallo: err.message,
        };
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    console.log('\n=== RESULTADO ===');
    console.log(`Modelo:          ${model}`);
    console.log(`Effort:          ${effort}`);
    if (result.fallo) {
        console.log(`FALLO:           ${result.fallo}`);
    } else {
        console.log(`Tiempo total:    ${result.tiempoSegundos}s`);
        console.log(`Palabras About:  ${result.palabrasAbout}`);
        console.log(`Cumple 300:      ${result.cumple300 ? 'SÍ' : 'NO'}`);
        console.log(`JSON válido:     ${result.jsonValido ? 'SÍ' : 'NO'}${result.parseError ? ` (${result.parseError})` : ''}`);
        console.log(`Shape completa:  ${result.shapeCompleta ? 'SÍ' : `NO (falta: ${result.campoFaltante})`}`);
    }

    const logPath = path.join(__dirname, 'bench-results-real-pdf.ndjson');
    fs.appendFileSync(logPath, JSON.stringify(result) + '\n');
    console.log('\nAñadido a:', logPath);
}

main();
