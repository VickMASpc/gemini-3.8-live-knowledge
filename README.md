# Gemini 3.8 Live — JavaScript knowledge workspace

> Verified against Google’s official documentation and the `@google/genai` SDK on 2026-09-16. The Live API is still labeled Preview; re-check [SOURCES.md](SOURCES.md) before production changes.

This workspace is a searchable, implementation-oriented guide to `gemini-3.8-live`. It covers JavaScript/TypeScript, WebSocket sessions, audio/video/text input, audio output, transcripts, microphone mute, VAD and barge-in, function calling, voices, context, resumption, authentication, costs, and failure handling.

## Start here

1. [Quick reference](QUICK-REFERENCE.md) — field names and common snippets.
2. [Model and architecture](guides/01-model-and-architecture.md) — what 3.8 Live is and is not.
3. [JavaScript session lifecycle](guides/02-javascript-session.md) — connect, send, receive, close.
4. [Tool calling](guides/07-tool-calling.md) — the production-critical call/validate/execute/respond loop.
5. [Runnable TypeScript examples](examples/README.md).
6. [Use-case patterns](USE-CASES.md) — product scenarios and safe architecture choices.
7. [Browser implementation](browser-demo/README.md) — complete HTML, CSS, and JavaScript demo with local simulation and optional Live mode.

## Guide map

| Need | File |
|---|---|
| Model choice, limits, 3.8-specific behavior | [01-model-and-architecture.md](guides/01-model-and-architecture.md) |
| SDK setup, callbacks, lifecycle | [02-javascript-session.md](guides/02-javascript-session.md) |
| Text, audio, image/video input | [03-input.md](guides/03-input.md) |
| Audio output and server events | [04-output-and-events.md](guides/04-output-and-events.md) |
| Input/output transcription and dedicated STT | [05-transcription.md](guides/05-transcription.md) |
| Mute, VAD, barge-in, playback clearing | [06-mute-vad-interruption.md](guides/06-mute-vad-interruption.md) |
| Functions, async scheduling, cancellation, security | [07-tool-calling.md](guides/07-tool-calling.md) |
| Voices and languages | [08-voices-and-language.md](guides/08-voices-and-language.md) |
| Context, compression, reconnection/resumption | [09-context-and-sessions.md](guides/09-context-and-sessions.md) |
| Browser auth and deployment topologies | [10-security-and-deployment.md](guides/10-security-and-deployment.md) |
| Latency, cost, quotas, reliability | [11-production-practices.md](guides/11-production-practices.md) |
| Symptoms and fixes | [12-troubleshooting.md](guides/12-troubleshooting.md) |
| Browser JavaScript architecture | [13-browser-javascript.md](guides/13-browser-javascript.md) |
| Event/config field lookup | [event-map.md](reference/event-map.md), [config-recipes.md](reference/config-recipes.md) |

## Fast search

From this directory:

```powershell
rg -n -i "toolCallCancellation|audioStreamEnd|sessionResumption|outputAudioTranscription" .
rg -n "^## " guides reference
```

See [SEARCH-INDEX.md](SEARCH-INDEX.md) for task-to-keyword mappings.

## Scope boundaries that prevent common mistakes

- `gemini-3.8-live` produces native audio. Do not configure text as its response modality; enable `outputAudioTranscription` when the UI needs text.
- `gemini-3.5-transcribe-live` is a separate continuous speech-to-text model. It supports interim/final transcripts and STT features such as custom vocabulary, timestamps, diarization, and smart transcription.
- A microphone mute is a client capture state plus a protocol signal. With automatic VAD, stop sending samples and send `{ audioStreamEnd: true }`; sending new audio reopens the stream. With manual VAD, send `activityEnd` instead.
- Live function calls are never executed automatically by the SDK. Validate the name and arguments, execute in trusted code, and return every result with the matching call `id`.
- A WebSocket connection and a logical session are different lifetimes. Use session resumption to bridge periodic connection resets and context compression to bound long-session context.

## Source policy

Claims are based on first-party Google documentation, the official `googleapis/js-genai` repository, and the npm registry. [SOURCES.md](SOURCES.md) records URLs, verification dates, and what each source supports.

See [VALIDATION.md](VALIDATION.md) for the exact checks performed and the boundaries of validation.
