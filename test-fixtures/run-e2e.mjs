import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const serverDir = path.join(repoRoot, 'optimizer-server');
const serverEntry = path.join(serverDir, 'server.js');
const pdfPath = path.join(__dirname, 'linkedin-real.pdf');
const schemaPath = path.join(serverDir, 'schemas', 'coach-turn.schema.json');
const transcriptPath = path.join(__dirname, 'e2e-chat-transcript.json');

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;
const READY_SIGNAL = 'escuchando en http://localhost';

const TURNS = [
    { userMessage: '(PDF upload)', expectedState: 'DIAGNOSIS' },
    { userMessage: 'ok, continúa', expectedState: 'HEADLINE' },
    { userMessage: 'A', expectedState: 'ABOUT' },
    { userMessage: 'A', expectedState: 'EXPERIENCE' },
    { userMessage: 'A', expectedState: 'FEATURED' },
    { userMessage: 'A', expectedState: 'SKILLS' },
    { userMessage: 'A', expectedState: 'RECOMMENDATIONS' },
    { userMessage: 'A', expectedState: 'DONE' },
];

function loadValidator() {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    try {
        const require = createRequire(path.join(serverDir, 'package.json'));
        const Ajv = require('ajv');
        const ajv = new Ajv({ strict: false });
        return ajv.compile(schema);
    } catch {
        return null;
    }
}

function startServer() {
    const child = spawn(process.execPath, [serverEntry], {
        cwd: serverDir,
        env: { ...process.env, PORT: String(PORT) },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
    child.stderr.on('data', (d) => process.stderr.write(`[server:err] ${d}`));
    return child;
}

function waitForReady(child, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        let buf = '';
        const timer = setTimeout(() => {
            reject(new Error(`Timed out after ${timeoutMs}ms waiting for readiness signal "${READY_SIGNAL}"`));
        }, timeoutMs);

        const onData = (d) => {
            buf += d.toString();
            if (buf.includes(READY_SIGNAL)) {
                cleanup();
                resolve();
            }
        };
        const onExit = (code) => {
            cleanup();
            reject(new Error(`Server exited before becoming ready (code ${code})`));
        };
        const onError = (err) => {
            cleanup();
            reject(err);
        };
        const cleanup = () => {
            clearTimeout(timer);
            child.stdout.off('data', onData);
            child.off('exit', onExit);
            child.off('error', onError);
        };

        child.stdout.on('data', onData);
        child.on('exit', onExit);
        child.on('error', onError);
    });
}

async function sendTurn({ conversationId, base64Data, userMessage }, timeoutMs) {
    const body = conversationId ? { conversationId, userMessage } : { base64Data };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
        res = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const events = [];
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let leftoverBuffer = '';

    const processLine = (line) => {
        if (!line.trim()) return;
        let evt;
        try {
            evt = JSON.parse(line);
        } catch (err) {
            throw new Error(`NDJSON parse error: ${err.message} — line: ${line}`);
        }
        events.push(evt);
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        leftoverBuffer += decoder.decode(value, { stream: true });
        const lines = leftoverBuffer.split('\n');
        leftoverBuffer = lines.pop();
        lines.forEach(processLine);
    }
    if (leftoverBuffer.trim()) processLine(leftoverBuffer);

    return events;
}

function validateTurnData(validateTurn, data, expectedState, turnIndex) {
    if (data.state !== expectedState) {
        throw new Error(`Turn ${turnIndex}: expected state="${expectedState}", got state="${data.state}"`);
    }

    if (validateTurn) {
        if (!validateTurn(data)) {
            throw new Error(`Turn ${turnIndex}: schema validation failed: ${JSON.stringify(validateTurn.errors)}`);
        }
    } else {
        for (const field of ['state', 'message']) {
            if (data[field] === undefined) {
                throw new Error(`Turn ${turnIndex}: missing required field "${field}"`);
            }
        }
        if (data.state !== 'DONE') {
            for (const field of ['diagnosis', 'questions']) {
                if (data[field] === undefined) {
                    throw new Error(`Turn ${turnIndex}: missing required field "${field}" for state ${data.state}`);
                }
            }
            if (data.state !== 'DIAGNOSIS') {
                if (!Array.isArray(data.alternatives) || data.alternatives.length < 1) {
                    throw new Error(`Turn ${turnIndex}: "alternatives" must be a non-empty array for state ${data.state}`);
                }
            }
        }
    }

    if (data.state === 'DONE') {
        if (!data.summary || typeof data.summary !== 'object') {
            throw new Error(`Turn ${turnIndex}: DONE state missing "summary" object`);
        }
        const hasFinalKey = Object.keys(data.summary).some((k) => k.endsWith('_final'));
        if (!hasFinalKey) {
            throw new Error(`Turn ${turnIndex}: "summary" has no key ending in "_final"`);
        }
    }
}

async function main() {
    if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size === 0) {
        console.error(`[e2e] Missing or empty PDF fixture: ${pdfPath}`);
        process.exitCode = 1;
        return;
    }
    if (!fs.existsSync(schemaPath)) {
        console.error(`[e2e] Missing schema: ${schemaPath}`);
        process.exitCode = 1;
        return;
    }

    const base64Data = fs.readFileSync(pdfPath).toString('base64');
    const validateTurn = loadValidator();
    console.log(`[e2e] schema validator: ${validateTurn ? 'ajv' : 'fallback structural check'}`);

    const child = startServer();
    const transcript = { timestamp: new Date().toISOString(), conversationId: null, turns: [] };

    try {
        await waitForReady(child);
        console.log(`[e2e] server ready on ${BASE_URL}`);

        let conversationId = null;

        for (let i = 0; i < TURNS.length; i++) {
            const { userMessage, expectedState } = TURNS[i];
            const isFirstTurn = i === 0;
            console.log(`[e2e] turn ${i}: sending "${userMessage}" (expect ${expectedState})`);

            const timeoutMs = isFirstTurn ? 320000 : 70000;
            const events = await sendTurn(
                {
                    conversationId,
                    base64Data: isFirstTurn ? base64Data : undefined,
                    userMessage: isFirstTurn ? undefined : userMessage,
                },
                timeoutMs
            );

            transcript.turns.push({ turnIndex: i, userMessage, events });

            const metaEvt = events.find((e) => e.type === 'meta');
            if (metaEvt) {
                conversationId = metaEvt.conversationId;
                transcript.conversationId = conversationId;
            }

            const errorEvt = events.find((e) => e.type === 'error');
            if (errorEvt) {
                console.error(`[e2e] turn ${i} returned error event:`, JSON.stringify(errorEvt, null, 2));
                throw new Error(`Turn ${i} failed with error event: ${errorEvt.message || errorEvt.code}`);
            }

            const turnEvt = events.find((e) => e.type === 'turn');
            if (!turnEvt) {
                throw new Error(`Turn ${i}: no "turn" event received. Events: ${JSON.stringify(events)}`);
            }

            validateTurnData(validateTurn, turnEvt.data, expectedState, i);
            console.log(`[e2e] turn ${i}: OK (state=${turnEvt.data.state})`);
        }

        fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));
        console.log(`[e2e] transcript written to ${path.relative(repoRoot, transcriptPath)}`);
        console.log('[e2e] ALL TURNS PASSED');
        process.exitCode = 0;
    } catch (err) {
        console.error(`[e2e] FAILED: ${err.message}`);
        process.exitCode = 1;
    } finally {
        child.kill('SIGKILL');
    }
}

main();
