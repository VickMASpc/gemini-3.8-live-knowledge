# Validation record

Date: 2026-09-16

## Completed

- Cross-checked the workspace against first-party Google model, Live API, capability, tool, session, ephemeral-token, transcription, speech, and WebSocket reference pages.
- Confirmed npm `latest` for `@google/genai` was `2.22.0`.
- Installed the example dependencies in a temporary validation directory: 46 packages audited, 0 vulnerabilities reported at that time.
- Ran `tsc --noEmit` under strict TypeScript settings; all five example `.ts` files passed.
- Checked all relative Markdown links; 0 broken local links.
- Scanned the deliverable for unfinished markers, embedded credentials, and obvious Google API key patterns; none found.

## Browser implementation extension

- Ran `node --check` on `server.js`, `app.js`, and `pcm-worklet.js`.
- Served the app at `http://127.0.0.1:4173` and used bundled Playwright with installed Google Chrome because the Browser-specific plugin/skill was unavailable.
- Verified page identity, non-blank primary surface, absence of framework overlays, and clean console during the Demo flow.
- Verified the pinned browser SDK bundle exposed `GoogleGenAI` and `Modality.AUDIO`.
- Exercised: Start Demo → local transcript → simulated allowlisted tool activity → model transcript → mute state → End.
- Verified `aria-pressed=true`, `data-state=muted`, and restored `Disconnected` state.
- Verified missing server credentials return an explicit `503`, render `Start failed` / `Could not connect`, and re-enable retry instead of reporting success. The corresponding browser network error is expected for this negative test.
- Verified documentation navigation endpoints.
- Checked desktop at 1440×1000 and mobile at 390×844; no horizontal mobile overflow was detected.
- Compared the ImageGen concept and latest desktop/mobile renders with `view_image`; see `browser-demo/DESIGN.md` for the fidelity ledger.

## Not performed

- No real Gemini API call was made because no credential was requested or used.
- Audio quality, end-to-end latency, browser microphone permissions, reconnect behavior, billing, quotas, and tool side effects were not live-tested.
- Live Gemini audio, real ephemeral-token provisioning, microphone capture, and actual model-driven function calls were not exercised because no credential was used.
- External documentation links were researched and opened during authoring, but no automated link-status monitor is included.

## Re-validation commands

```powershell
cd examples
npm install
npm run typecheck
npm view @google/genai version dist-tags --json
```

Then compare any SDK/model changes with [SOURCES.md](SOURCES.md), especially tool scheduling enums, auth-token field types, model response modality, and session limits.
