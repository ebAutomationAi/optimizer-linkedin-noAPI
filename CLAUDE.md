<!-- CLAUDE.md — optimizer-linkedin-noAPI / nuevo -->
# CLAUDE.md — optimizer-linkedin-noAPI

## Project rules
- Do not modify `server.js` without benchmark data justifying the change.
- Do not migrate from CLI to SDK (subscription billing vs API key billing).
- Do not generate synthetic PDFs for tests: always use `test-fixtures/linkedin-real.pdf`.
- Atomic commits, imperative messages in Spanish with conventional prefix.
- Do not open PRs. User reviews and merges manually.

## Active configuration
- Model: `claude-sonnet-4-6`
- Effort: `--effort low`
- Real observed duration: ~138-142s end-to-end
- Backend timeout: 300000ms
- Frontend timeout: 320000ms
- Progress timers: 35000ms / 65000ms / 95000ms

## Reference files
- `CONTEXT.md` — operational context, paste at start of each new session
- `CHANGELOG-auditoria.md` — detailed patch history S1-S7
- `TEST-E2E-PDF-REAL.md` — E2E test procedure with real PDF
- `scratchpad/bench-results-real-pdf.ndjson` — model benchmark results

## Token efficiency rules
1. All prompts sent to Claude Code must be written in English.
2. Claude Code must respond in English at all times.
3. If the only required action is running terminal commands,
   output the commands directly without prose wrapper — the user will run them manually.
4. If Claude Code needs confirmation before proceeding, ask in a single line
   at the end of the output block. No preamble.