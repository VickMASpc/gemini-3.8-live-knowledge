# Gemini 3.8 Live Playground — AI Studio UI recreation

Vanilla **HTML + CSS + JavaScript**, bundled with **Vite**, deployable to **GitHub Pages**. This is a community UI recreation based on the supplied mobile screenshots, **not an official Google product**.

## Features included in this version

- Recreated dark mobile UI: fixed Playground header; intro heading/suggestions/map promo; anchored text composer; modal/drawer; dropdowns; settings; live status; streaming conversation.
- Both official model IDs: `gemini-3.8-live` and `gemini-3.8-live-extended-thinking`.
- Model-specific thinking controls (Low/Medium/High **only** for Extended Thinking).
- All 30 prebuilt voices exposed through voice selector (voice selection passed to Live API).
- Media resolution selector; session compression sliders; system instructions.
- WebSocket-based Live SDK connection; typed input and audio output; streamed output/input transcripts; downloadable/playable turn audio; microphone capture with AudioWorklet and PCM16 16 kHz resampling; streaming PCM16 24 kHz playback.
- Camera facing mode selection and screen sharing (where browser permits) with video frames at 1 FPS.
- Function declarations JSON editor; manual tool-call JSON responses; automatic local handling of `get_current_time` / `get_page_title`; unsupported declarations give explicit errors instead of executing arbitrary JS.
- Search grounding toggle, use of `NON_BLOCKING` functions, `interactionStatus` handling, basic session resumption support.
- `Get code` exports the current session's model/config (without secrets).
- API key held **only in JS memory**, never written to localStorage, cookies, build output, or GitHub.
- Deploy workflow for `main`, path-independent Vite assets using `base: './'`.

## Run locally

```bash
npm install
npm run dev
```

Open the displayed local URL, click the key icon in Run settings (or run a prompt), and enter your own Gemini API key or a short-lived token. Microphone/camera/screen-sharing require browser permission. For GitHub Pages, the HTTPS origin meets secure-context requirements; screen sharing varies with browser and may be unavailable on mobile Android.

## Deploy to GitHub Pages

1. Create an empty GitHub repository and add the project files at its root.
2. Commit and push to its `main` branch.
3. Under **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` runs `npm install`, `npm run build` and deploys `dist`.
5. The site works at `https://YOUR_USERNAME.github.io/YOUR_REPO/` and `https://YOUR_USERNAME.github.io/`. No Vite `base` changes required.

## Important authentication design

GitHub Pages is a **static file host**, not a secure backend. Do **not** embed a permanent Gemini API key into Vite environment variables, source files, or JavaScript bundles: `VITE_*` values are public in the compiled site. This project offers **BYOK for personal testing**, where you manually enter your key in the browser. Browser-held permanent keys can still be exposed by browser extensions, devtools, malicious dependencies, or users of a shared machine. **It is not a secure public multi-user deployment.**

For a publicly used site, retain this static UI but deploy a tiny trusted authentication/token service (e.g. serverless endpoint) that mints **short-lived ephemeral Live API tokens** under authenticated and rate-limited access. Set the client to request the token and connect directly to Gemini. The project does **not** include that service, because the requested deliverable is pure GitHub Pages.

## API limitations and what is not included

- There are no baked-in credentials, so no server connection can be end-to-end verified without a real API key and your own browser permissions. The UI and JS source are testable independently.
- This is a screenshot-derived **first pass at pixel fidelity**. The uploaded capture includes Chrome/Android browser chrome; only the Google webpage is recreated. Exact parity across desktop/other breakpoints and unshown popover states requires new reference captures and visual regression measurements.
- The 30 voice rows match the Google prebuilt voice names/descriptions. Voice **audition audio samples** are not included; clicking an entry selects it rather than imitating a sample with a wrong synthesizer.
- `mediaResolution` UI labels follow the screenshot (e.g. `Medium (258 tokens / image)`). Google's *general* current media token tables can differ by model/media version; the wire setting uses the official enum.
- Google AI Studio's exact *internal* backend processing, account-level quota, pricing, preview assets, and internal recording pipeline are not reproduced.
- Audio models output audio; transcript display uses `outputAudioTranscription`, not unsupported text-only mode.
- Extended Thinking **may emit reasoning/tools/audio after** `turnComplete`. This implementation listens beyond `turnComplete` and checks `interactionStatus` when available.
- Session-resumption handling is best-effort based on server-provided handles. Network interruptions, expiring ephemeral tokens, or device sleep may still require reopening the session.
- Function calls are not code execution: arbitrary JavaScript strings from JSON won't run. Use manual response or add an explicit trusted handler in `src/live.js`.
- Changing settings during a live session takes effect on the **next** session, like a session setup property.
- Costs, regional model access, latency, usage limits, and working of Search grounding depend on your own Google account/API project.

## Architecture

```
index.html                   DOM and faithful layout structure
src/style.css                UI tokens, mobile/desktop styling, drawers
src/app.js                   state, settings, 30 voices, dialogs, messages
src/live.js                  Live SDK connection, tool calls, session state, camera
src/audio.js                 AudioWorklet mic/resampling, PCM playback, WAV
public/intro-preview.webp    user-supplied screenshot crop of AI Studio promo
vite.config.js               relative base for GitHub Pages
.github/workflows/deploy.yml automated Pages deployment
```

## Official sources checked (October 15, 2026)

- [Gemini 3.8 Live model card](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live)
- [Gemini 3.8 Live Extended Thinking model card](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live-extended-thinking)
- [Live API capabilities and model comparison](https://ai.google.dev/gemini-api/docs/live-api/capabilities)
- [Live API tools and Search grounding](https://ai.google.dev/gemini-api/docs/live-api/tools)
- [Audio/video SDK usage](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk)
- [Session compression and resumption](https://ai.google.dev/gemini-api/docs/live-api/session-management)
- [Browser ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)
- [30 prebuilt Google voices](https://ai.google.dev/gemini-api/docs/speech-generation)

## UI fidelity next-pass checklist

1. Load the deployed page in the **same phone/browser and screen scaling** as your screenshot; never compare Chrome bars or Android nav bars to page code.
2. Capture identical UI states: default intro, standard-model drawer, extended-model drawer, expanded thinking/voice selectors, camera picker, live/connecting/transcript states.
3. Compare screenshot image crops with browser screenshots at identical **CSS viewport size**; adjust typography, spacing, colors, borders and menu scroll positioning until the pixel diff is minimal.
4. Verify all 30 voices and the precise DOM/animation behavior, if you can export non-screenshot references from AI Studio.
5. Only then expand desktop parity, function editor/UI states, and the deeper session resumption/cancellation controls not present in the references.
