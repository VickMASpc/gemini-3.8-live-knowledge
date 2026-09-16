# Model and architecture

Tags: `#gemini-3.8-live` `#architecture` `#limits` `#migration`

## What `gemini-3.8-live` is

`gemini-3.8-live` is Google’s stable default for low-latency, real-time voice agents. It accepts text, images/video frames, and audio; it returns native audio. It supports interleaved reasoning, function calling, Google Search grounding, full-session client-content updates, and bidirectional streaming over a stateful WebSocket.

| Property | Value |
|---|---|
| Model ID | `gemini-3.8-live` |
| Input | Text, image, audio, video frames |
| Output for Live use | Native audio; obtain display text with output audio transcription |
| Input context limit | 131,072 tokens |
| Output limit | 65,536 tokens |
| Function calling | Supported; non-blocking by default |
| Google Search | Supported |
| Structured output / code execution / URL context / Maps | Not supported |
| Thinking config | Interleaved reasoning, but **do not** set `thinkingConfig` / `thinkingLevel` |

## Three similarly named jobs

| Job | Recommended model/pattern | Why |
|---|---|---|
| Conversational voice or vision agent | `gemini-3.8-live` | Lowest-latency spoken conversation plus tools |
| Voice agent requiring configured deeper background reasoning | `gemini-3.8-live-extended-thinking` | Supports `thinkingLevel: low | medium | high`; async tools only |
| Continuous speech-to-text | `gemini-3.5-transcribe-live` | Dedicated interim/final transcription, vocabulary, timestamps, diarization, smart mode |

Do not use `responseModalities: [Modality.TEXT]` as a shortcut for text-only output from `gemini-3.8-live`. Configure audio and enable `outputAudioTranscription`.

## Implementation topologies

### Server-to-server

Browser/app → your WebSocket or WebRTC relay → backend `@google/genai` session → Gemini.

Use this when tools require secrets, central policy, audit logs, or private network access. It adds a relay hop and bandwidth cost.

### Client-to-server

Browser/app → Gemini WebSocket directly, authenticated with a short-lived ephemeral token minted by your backend.

Use this for the best media latency. Never ship a long-lived Gemini API key in browser code. Tool calls that touch trusted systems should still be sent to an authenticated backend for validation/execution.

## Protocol lifecycle

1. Open WebSocket / call `ai.live.connect(...)`.
2. Send immutable setup: model, modalities, voice, system instruction, tools, VAD, context options.
3. Wait for setup completion (the SDK’s `connect` handles this before returning).
4. Stream realtime audio/video/text and/or ordered client content.
5. Route every server message: content, tools, cancellation, resumption, GoAway, usage.
6. On interruption, immediately clear queued model audio.
7. On GoAway or close, reconnect using the latest resumable handle.
8. Close intentionally when finished.

## Gemini 3.8-specific migration rules

- Change older model IDs to `gemini-3.8-live`.
- Omit `thinkingConfig`; it is rejected/not supported for this model.
- Non-blocking function behavior is the default. Set `Behavior.BLOCKING` only when the conversation must pause.
- `sendClientContent` can be used throughout the session with explicit `user` / `model` roles.
- `turnComplete: true` interrupts active generation unconditionally.
- Proactive audio is permanently enabled; setting it to false is an error.
- Affective dialogue configuration was removed; remove `enableAffectiveDialog`.
- Default turn coverage includes audio activity and all video. Send video only when it is useful.
- Response modality is audio; use output transcription for text UI.

Sources: [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live), [capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [overview](https://ai.google.dev/gemini-api/docs/live-api).
