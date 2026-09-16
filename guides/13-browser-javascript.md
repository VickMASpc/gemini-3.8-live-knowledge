# Browser JavaScript implementation guidance

Tags: `#javascript` `#browser` `#html` `#css` `#audio-worklet` `#ephemeral-token`

The complete reference app is in [`browser-demo/`](../browser-demo/README.md). This guide explains the choices that matter when adapting it.

## Split responsibilities deliberately

| Layer | Owns | Must not own |
|---|---|---|
| HTML | Semantic structure, labels, live regions, templates | API keys or generated content |
| CSS | Tokens, layout, visual states, responsive rules | Application truth |
| Browser JS | Capture/playback, UI state, ephemeral-token session | Standard API key, privileged authorization |
| Backend | User authentication, token minting, protected tools | Browser microphone relay unless topology requires it |

Keep connection, capture, playback, model generation, and tool execution as separate states. “Connected” does not mean “microphone active,” and “generation complete” does not mean “playback finished.”

## Use modules; avoid globals

Use `<script type="module">`, `const`/`let`, small pure helpers, and one explicit state object or state machine. Do not attach session objects, keys, or tool handlers to `window`. The reference uses one module for readability; a production app should split transport, audio input, audio output, tools, and UI rendering into modules.

Recommended modules:

```text
live-client.js       connection, setup, server-message routing
audio-input.js       permissions, AudioWorklet, PCM framing
audio-output.js      decode, jitter queue, interruption
tool-dispatcher.js   schemas, allowlist, timeouts, cancellation
ui-state.js          render-only application state
```

## Dependency loading

The example dynamically imports a pinned CDN bundle so a reader can run plain files. For production:

```bash
npm install @google/genai
```

```js
import { GoogleGenAI, Modality } from '@google/genai';
```

Commit the lockfile, review SDK upgrades, and serve bundled code from your own origin. A CDN import adds availability, supply-chain, CSP, and caching considerations.

## Authentication boundary

Browser code should fetch a one-use, short-lived token from an authenticated same-origin endpoint and construct the Live client with `v1beta`. Never expose the standard key. The endpoint must enforce:

- authenticated user/session;
- CSRF and allowed-origin policy;
- entitlement and per-user/IP rate limits;
- shortest useful token lifetimes;
- `liveConnectConstraints` for model/config where appropriate;
- `Cache-Control: no-store` and no token logging.

An ephemeral token reduces leaked-key risk; it does not replace application authentication.

## Microphone pipeline

Use `AudioWorklet`, not deprecated `ScriptProcessorNode`. Typical browser input is 44.1/48 kHz Float32. The worklet should:

1. receive mono frames;
2. accumulate approximately 20–40 ms;
3. downsample to 16 kHz;
4. clamp and convert to signed PCM16LE;
5. transfer the `ArrayBuffer` to the main module without copying;
6. base64-encode only at the SDK boundary.

Do not log chunks. Bound all queues, and stop tracks when the session ends or the page unloads.

The included resampler uses averaged windows for clarity. A production audio product may use a higher-quality band-limited resampler and should test different hardware/sample rates.

## Output pipeline

Decode model base64 audio as PCM16LE at 24 kHz. Schedule `AudioBufferSourceNode`s against a monotonic playhead:

```js
const startsAt = Math.max(context.currentTime + 0.02, nextPlaybackTime);
nextPlaybackTime = startsAt + audioBuffer.duration;
source.start(startsAt);
```

Retain every scheduled source. On `serverContent.interrupted`, stop them all, clear encoded/decoded queues, and reset the playhead immediately. Otherwise barge-in will sound broken even if the server correctly stopped generation.

## Mute and VAD

Mute must stop local transmission and finalize correctly:

- automatic VAD: disable the track/sending and call `sendRealtimeInput({ audioStreamEnd: true })`;
- manual VAD: disable sending and call `activityEnd`; call `activityStart` again on unmute;
- unmuting automatic VAD needs no reopen signal—the next audio chunk reopens the stream.

Do not rebuild config toggles during an active connection. Setup is immutable; disable those controls or reconnect deliberately.

## Message routing

Handle every part and independent event family:

```js
for (const part of message.serverContent?.modelTurn?.parts ?? []) {
  if (part.inlineData?.data) enqueueAudio(part.inlineData.data);
}
```

Route transcripts, interruption, generation/turn completion, tool calls, cancellations, usage, GoAway, and resumption updates independently. Avoid a long `if/else if` chain that silently ignores multiple fields.

## Tool calling in browser architectures

The included tool is local and read-only. For protected or consequential tools, the browser dispatcher should send the validated call to your authenticated backend. The backend revalidates the name and arguments, authorizes the current user, executes with least-privilege credentials, and returns a minimal response.

Maintain a map of `call.id → AbortController`. Return one response for every call, including structured errors. Deduplicate external writes with a durable idempotency record; an in-memory browser map is insufficient.

## DOM and accessibility

- Use `textContent`, never `innerHTML`, for transcripts, tool output, and error messages.
- Use real buttons/selects/inputs and `aria-pressed` for mute.
- Put connection status and streamed lists in restrained live regions; avoid announcing raw audio events.
- Preserve keyboard focus and visible focus rings.
- Respect `prefers-reduced-motion`.
- Show a persistent microphone/privacy state.

## Error handling and cleanup

Wrap start/stop operations, return the UI to a retryable state, and do not claim a connection succeeded until `live.connect` resolves. On failure:

- stop media tracks;
- disconnect worklets;
- close audio contexts;
- stop/clear playback;
- abort tools;
- close the session;
- surface a concise error without secrets.

Handle `visibilitychange`, device loss, permission denial, offline/online transitions, `goAway`, and close codes in production.

## Testing matrix

- Demo mode: start → transcript/tool events → mute/unmute → end.
- Live mode: permission accepted/denied; token success/failure; SDK load failure.
- Audio: 44.1 and 48 kHz input; headphones/speakers; echo cancellation; underrun.
- Turn-taking: talk over output; rapid mute; long silence; manual and automatic VAD.
- Tools: success, invalid args, timeout, cancellation, duplicate ID, backend denial.
- Lifecycle: background tab, device disconnect, GoAway, reconnect, long session.
- Layout: keyboard-only, reduced motion, narrow mobile, zoom to 200%.

Sources: [Live API capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens), [Live API reference](https://ai.google.dev/api/live), [best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices).
