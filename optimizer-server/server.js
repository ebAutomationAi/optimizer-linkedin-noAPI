const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const Ajv = require('ajv');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

const DISALLOWED_TOOLS_RESUME = DISALLOWED_TOOLS + ',Read';

const ajv = new Ajv({ strict: false });

const COACH_SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'prompts', 'coach-system-prompt.md'), 'utf8');

const coachTurnSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'schemas', 'coach-turn.schema.json'), 'utf8'));
const validateCoachTurn = ajv.compile(coachTurnSchema);

const conversations = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [conversationId, entry] of conversations.entries()) {
        if (now - entry.lastUsedAt > 30 * 60 * 1000) {
            conversations.delete(conversationId);
            fs.rmSync(entry.cwd, { recursive: true, force: true });
            console.log('[chat] session expired and cleaned:', conversationId);
        }
    }
}, 5 * 60 * 1000);

function runClaude(pdfPath, onProgress) {
    const prompt = `Lee el archivo PDF en "${pdfPath}" con la herramienta Read UNA SOLA VEZ (no lo releas ni pidas páginas adicionales) y analiza el perfil de LinkedIn que contiene. No tienes acceso a herramientas de terminal: cuenta caracteres y palabras mentalmente, sin ejecutar comandos. En cuanto tengas el contenido del PDF, escribe directamente el JSON final sin pasos intermedios.\n\n${PROMPT_TEMPLATE}`;

    const TIMEOUT_MS = 300000;

    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;
    delete childEnv.ANTHROPIC_AUTH_TOKEN;

    return new Promise((resolve, reject) => {
        const child = spawn('claude', [
            '-p', prompt,
            '--model', 'claude-sonnet-4-6',
            '--effort', 'low',
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

        rl.on('line', (line) => {
            if (!line.trim()) return;
            let event;
            try {
                event = JSON.parse(line);
            } catch {
                return;
            }

            if (event.type === 'system' && event.subtype === 'init') {
                console.log(`[analyze] sesión iniciada (modelo: ${event.model})`);
                onProgress?.({ step: 'started' });
            } else if (event.type === 'assistant') {
                for (const block of event.message?.content || []) {
                    if (block.type === 'tool_use') {
                        console.log(`[analyze] usando herramienta: ${block.name} (${JSON.stringify(block.input)})`);
                        onProgress?.({ step: 'reading_pdf' });
                    } else if (block.type === 'text' && block.text) {
                        console.log('[analyze] redactando respuesta...');
                        onProgress?.({ step: 'generating' });
                    }
                }
            } else if (event.type === 'user') {
                console.log('[analyze] resultado de herramienta recibido, continuando análisis...');
                onProgress?.({ step: 'tool_result' });
            } else if (event.type === 'result') {
                console.log(`[analyze] terminado en ${event.duration_ms}ms (error: ${event.is_error})`);
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

            if (!finalEvent) {
                return reject(new Error(stderrBuf || `Claude Code terminó con código ${code} sin devolver resultado.`));
            }
            if (finalEvent.is_error) {
                return reject(new Error(finalEvent.result || 'Error ejecutando Claude Code'));
            }
            resolve(finalEvent.result);
        });

        child.on('error', (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(err);
        });
    });
}

function runCoachTurn(args, cwd, timeoutMs, onProgress) {
    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;
    delete childEnv.ANTHROPIC_AUTH_TOKEN;

    return new Promise((resolve, reject) => {
        const child = spawn('claude', args, { cwd, env: childEnv });

        let finalEvent = null;
        let stderrBuf = '';
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill('SIGKILL');
            reject(new Error(`Timeout: Claude Code no terminó en ${timeoutMs / 1000}s, se ha detenido el proceso.`));
        }, timeoutMs);

        const rl = readline.createInterface({ input: child.stdout });

        rl.on('line', (line) => {
            if (!line.trim()) return;
            let event;
            try {
                event = JSON.parse(line);
            } catch {
                return;
            }

            if (event.type === 'assistant') {
                for (const block of event.message?.content || []) {
                    if (block.type === 'tool_use') {
                        onProgress?.({ step: 'reading_pdf' });
                    } else if (block.type === 'text' && block.text) {
                        onProgress?.({ step: 'generating' });
                    }
                }
            } else if (event.type === 'result') {
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

            if (!finalEvent) {
                return reject(new Error(stderrBuf || `Claude Code terminó con código ${code} sin devolver resultado.`));
            }
            if (finalEvent.is_error) {
                return reject(new Error(finalEvent.result || 'Error ejecutando Claude Code'));
            }
            resolve(finalEvent.result);
        });

        child.on('error', (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function resolveCoachTurn(resultText, sessionId, cwd, send) {
    const rawText = resultText.replace(/```json|```/g, '').trim();

    let parsed;
    let parseError = null;
    try {
        parsed = JSON.parse(rawText);
    } catch (err) {
        parseError = err;
    }

    if (!parseError && validateCoachTurn(parsed)) {
        return parsed;
    }

    send({ type: 'progress', step: 'retry_schema' });

    const retryPrompt = parseError
        ? 'Your previous response was not valid JSON. Return ONLY the JSON object matching the coach turn schema. No markdown, no backticks.'
        : 'Your previous response did not match the required schema. Return ONLY valid JSON. Errors: ' + JSON.stringify(validateCoachTurn.errors);

    const retryArgs = [
        '-p', retryPrompt,
        '--resume', sessionId,
        '--model', 'claude-sonnet-4-6',
        '--effort', 'low',
        '--output-format', 'stream-json',
        '--verbose',
        '--setting-sources', '',
        '--disallowedTools', DISALLOWED_TOOLS_RESUME
    ];

    const retryResultText = await runCoachTurn(retryArgs, cwd, 60000, (progress) => send({ type: 'progress', ...progress }));
    const retryRaw = retryResultText.replace(/```json|```/g, '').trim();

    let retryParsed;
    let retryParseError = null;
    try {
        retryParsed = JSON.parse(retryRaw);
    } catch (err) {
        retryParseError = err;
    }

    if (retryParseError || !validateCoachTurn(retryParsed)) {
        send({ type: 'error', code: 'schema_violation', message: JSON.stringify(validateCoachTurn.errors) });
        return null;
    }

    return retryParsed;
}

app.post('/api/analyze', async (req, res) => {
    const { base64Data } = req.body;

    if (!base64Data) {
        return res.status(400).json({ error: 'Falta el PDF (base64Data).' });
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizer-'));
    const pdfPath = path.join(tmpDir, 'perfil.pdf');

    console.log(`[analyze] petición recibida, PDF guardado en ${pdfPath}`);

    res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    });

    const send = (obj) => res.write(`${JSON.stringify(obj)}\n`);

    try {
        fs.writeFileSync(pdfPath, Buffer.from(base64Data, 'base64'));

        const resultText = await runClaude(pdfPath, (progress) => send({ type: 'progress', ...progress }));
        const rawText = resultText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(rawText);
        send({ type: 'done', data: parsed });

    } catch (err) {
        console.error(`[analyze] error: ${err.message}`);
        send({ type: 'error', message: err.message });
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        res.end();
    }
});

app.post('/api/chat', async (req, res) => {
    const { conversationId, base64Data, userMessage } = req.body;

    const isFirstTurn = !conversationId;

    if (isFirstTurn && !base64Data) {
        return res.status(400).json({ error: 'Missing base64Data' });
    }

    let entry = null;
    if (!isFirstTurn) {
        entry = conversations.get(conversationId);
        if (entry && !userMessage) {
            return res.status(400).json({ error: 'Missing userMessage' });
        }
    }

    console.log(`[chat] petición recibida (${isFirstTurn ? 'first turn' : `resume ${conversationId}`})`);

    res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    });

    const send = (obj) => res.write(`${JSON.stringify(obj)}\n`);

    try {
        if (!isFirstTurn && !entry) {
            send({ type: 'error', code: 'conversation_expired', message: 'Session not found or expired. Please start over.' });
            return;
        }

        let sessionId, cwd, args, timeoutMs;

        if (isFirstTurn) {
            const newConversationId = crypto.randomUUID();
            sessionId = crypto.randomUUID();
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coach-'));
            const pdfPath = path.join(tmpDir, 'perfil.pdf');
            fs.writeFileSync(pdfPath, Buffer.from(base64Data, 'base64'));

            conversations.set(newConversationId, {
                sessionId,
                cwd: tmpDir,
                pdfPath,
                createdAt: Date.now(),
                lastUsedAt: Date.now()
            });

            cwd = tmpDir;
            timeoutMs = 300000;

            const firstTurnPrompt = `Read the PDF at ${pdfPath} once with the Read tool and produce the DIAGNOSIS turn as JSON.`;

            args = [
                '-p', firstTurnPrompt,
                '--session-id', sessionId,
                '--system-prompt', COACH_SYSTEM_PROMPT,
                '--model', 'claude-sonnet-4-6',
                '--effort', 'low',
                '--output-format', 'stream-json',
                '--verbose',
                '--setting-sources', '',
                '--disallowedTools', DISALLOWED_TOOLS,
                '--add-dir', tmpDir
            ];

            send({ type: 'meta', conversationId: newConversationId, sessionId });
        } else {
            entry.lastUsedAt = Date.now();
            sessionId = entry.sessionId;
            cwd = entry.cwd;
            timeoutMs = 60000;

            args = [
                '-p', userMessage,
                '--resume', sessionId,
                '--model', 'claude-sonnet-4-6',
                '--effort', 'low',
                '--output-format', 'stream-json',
                '--verbose',
                '--setting-sources', '',
                '--disallowedTools', DISALLOWED_TOOLS_RESUME
            ];
        }

        const resultText = await runCoachTurn(args, cwd, timeoutMs, (progress) => send({ 
            type: 'progress', ...progress }));
        const turn = await resolveCoachTurn(resultText, sessionId, cwd, send);

        if (turn) {
            send({ type: 'turn', data: turn });
        }

        console.log(`[chat] turno completado (${isFirstTurn ? 'first turn' : `resume ${conversationId}`})`);
    } catch (err) {
        console.error(`[chat] error: ${err.message}`);
        send({ type: 'error', code: 'cli_error', message: err.message });
    } finally {
        res.end();
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Optimizer server (Claude Code CLI) escuchando en http://localhost:${PORT}`);
});
