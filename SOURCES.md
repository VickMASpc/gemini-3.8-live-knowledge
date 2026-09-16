# Sources and freshness

Last verified: **2026-09-16**. Google marks the Live API as Preview, so model behavior, fields, quotas, and SDK signatures can change.

## Primary documentation

| Source | Used for |
|---|---|
| [Gemini 3.8 Live model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live) | Stable model ID, modalities, token limits, 3.8 migration differences |
| [Live API overview](https://ai.google.dev/gemini-api/docs/live-api) | Architecture, use cases, input/output formats, deployment options |
| [Capabilities guide](https://ai.google.dev/gemini-api/docs/live-api/capabilities) | JavaScript config, media, transcripts, voices, VAD, limits, languages |
| [Tool use](https://ai.google.dev/gemini-api/docs/live-api/tools) | Function declarations, manual responses, async behavior, scheduling, Search |
| [Session management](https://ai.google.dev/gemini-api/docs/live-api/session-management) | Compression, resumption tokens, GoAway, generation completion |
| [Ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens) | Browser auth, token lifetimes, constrained configs |
| [Live WebSocket API reference](https://ai.google.dev/api/live) | Canonical client/server message fields and event semantics |
| [Live API best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices) | Chunking, resampling, prompting, context, costs, reliability |
| [Live transcription](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe) | Dedicated STT model, interim/final text, smart/verbatim, vocabulary |
| [Speech generation / voices](https://ai.google.dev/gemini-api/docs/speech-generation) | Voice names and characteristics referenced by Live native audio |
| [Function calling](https://ai.google.dev/gemini-api/docs/function-calling) | Function schema and security best practices |

## SDK and samples

| Source | Used for |
|---|---|
| [`googleapis/js-genai`](https://github.com/googleapis/js-genai) | Official JavaScript/TypeScript SDK behavior and samples |
| [`src/live.ts`](https://github.com/googleapis/js-genai/blob/main/src/live.ts) | `Session` send methods and callback lifecycle |
| [`sdk-samples/live_server.ts`](https://github.com/googleapis/js-genai/blob/main/sdk-samples/live_server.ts) | Official server relay pattern |
| [`@google/genai` on npm](https://www.npmjs.com/package/@google/genai) | Package version and installation |

At verification time, npm `latest` reported `@google/genai` **2.22.0**. Examples pin the compatible major range and are type-checked locally without making an API call.

## Important documentation caveat

The general tool-use comparison table still names older Live models in some rows, while the same page’s current samples use `gemini-3.8-live`. For 3.8-specific behavior, this workspace gives precedence to the dedicated Gemini 3.8 model page and current capabilities table: non-blocking function calling is the default, blocking remains available for compatibility, and scheduling is supported.
