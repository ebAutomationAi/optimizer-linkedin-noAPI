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

// ----------------------------------------------------------------------
// 1. Prompts y plantillas
// ----------------------------------------------------------------------

// Este prompt se usa SOLO para el análisis inicial (endpoint /api/analyze)
const PROMPT_TEMPLATE = `Eres un experto de clase mundial en optimización de perfiles de LinkedIn con enfoque en conversión B2B.
Analiza el perfil de LinkedIn del PDF adjunto y devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta (sin markdown, sin backticks, solo el JSON):
{
  "profile": { ... },
  "overall_score": 62,
  "strategy": { ... },
  "sections": { ... }
}
INSTRUCCIONES CRÍTICAS:
- Analiza ÚNICAMENTE el perfil real del PDF adjunto. No inventes ni supongas datos.
- Los campos "optimized" deben ser textos COMPLETOS listos para copiar y pegar, personalizados para el sector, idioma y objetivo de esta persona concreta.
- El About optimizado debe tener mínimo 300 palabras con la estructura indicada.
- Los scores van de 0 a 100. Sé honesto, específico y diferenciador entre secciones.
- Adapta el idioma de todos los textos optimizados al idioma del perfil (español, inglés u otro).
- Devuelve SOLO el JSON. Sin texto introductorio, sin explicaciones, sin backticks, sin markdown. Solo el objeto JSON.`;

// System prompt para el coach (se pasa UNA SOLA VEZ en el primer turno mediante --system-prompt)
const COACH_SYSTEM_PROMPT = fs.readFileSync(
    path.join(__dirname, 'prompts', 'coach-system-prompt.md'),
    'utf8'
);

// ----------------------------------------------------------------------
// 2. Configuración de herramientas deshabilitadas
// ----------------------------------------------------------------------

const DISALLOWED_TOOLS = [
    'Bash', 'PowerShell', 'Write', 'Edit', 'NotebookEdit', 'WebFetch', 'WebSearch',
    'Task', 'Skill', 'Artifact', 'TodoWrite', 'ToolSearch', 'Monitor',
    'CronCreate', 'CronDelete', 'CronList', 'RemoteTrigger', 'SendMessage',
    'PushNotification', 'DesignSync', 'EnterWorktree', 'ExitWorktree',
    'ScheduleWakeup', 'TaskOutput', 'TaskStop', 'ReportFindings'
].join(',');

// En el resume también deshabilitamos 'Read' para que no relea el PDF
const DISALLOWED_TOOLS_RESUME = DISALLOWED_TOOLS + ',Read';

// ----------------------------------------------------------------------
// 3. Validación de esquema (AJV)
// ----------------------------------------------------------------------

const ajv = new Ajv({ strict: false });
const coachTurnSchema = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'schemas', 'coach-turn.schema.json'), 'utf8')
);
const validateCoachTurn = ajv.compile(coachTurnSchema);

// ----------------------------------------------------------------------
// 4. Almacenamiento de sesiones
// ----------------------------------------------------------------------

const conversations = new Map();

// Limpieza de sesiones inactivas (30 min)
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

// ----------------------------------------------------------------------
// 5. Funciones auxiliares para ejecutar Claude Code
// ----------------------------------------------------------------------

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

    console.log('[DEBUG rawText]:', rawText);
    console.log('[DEBUG parsed]:', JSON.stringify(parsed, null, 2));
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

// ----------------------------------------------------------------------
// 6. Endpoints
// ----------------------------------------------------------------------

// /api/analyze - análisis único (sin conversación)
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

// /api/chat - conversación coach (con múltiples turnos)
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
            // ---- PRIMER TURNO ----
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
                '--system-prompt', COACH_SYSTEM_PROMPT,  // ✅ SOLO aquí se pasa el system prompt
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
            // ---- TURNOS DE RESUME ----
            entry.lastUsedAt = Date.now();
            sessionId = entry.sessionId;
            cwd = entry.cwd;
            timeoutMs = 60000;

            // ✅ CORRECCIÓN: el prompt debe ser SOLO el mensaje del usuario.
            // NO se debe repetir el system prompt porque ya está en la sesión.
            args = [
                '-p', `${COACH_SYSTEM_PROMPT}\n\n${userMessage}`,
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
            type: 'progress',
            ...progress
        }));
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

// ----------------------------------------------------------------------
// 7. Inicio del servidor
// ----------------------------------------------------------------------

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Optimizer server (Claude Code CLI) escuchando en http://localhost:${PORT}`);
});