# JavaScript session lifecycle

Tags: `#javascript` `#typescript` `#sdk` `#websocket` `#lifecycle`

## Install and authenticate

```bash
npm install @google/genai
```

For trusted Node.js/server code:

```ts
import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

The SDK can also read its conventional environment variable, but passing the server-only value explicitly makes the trust boundary obvious. Never embed that key in a browser bundle; see [security and deployment](10-security-and-deployment.md).

## Minimal connection

```ts
const session = await ai.live.connect({
  model: 'gemini-3.8-live',
  config: {
    responseModalities: [Modality.AUDIO],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  },
  callbacks: {
    onopen: () => console.log('opened'),
    onmessage: (message) => route(message),
    onerror: (event) => console.error('live error', event),
    onclose: (event) => console.log('closed', event.code, event.reason),
  },
});
```

Setup fields cannot be changed while the connection is open. To change voice, tool declarations, system instructions, or VAD configuration, create a new connection (session resumption can preserve logical context while allowing most configuration changes).

## The four client actions

| Intent | SDK call | Notes |
|---|---|---|
| Ordered history or explicit turn | `sendClientContent({ turns, turnComplete })` | Preserves role/order; `turnComplete: true` triggers and interrupts active generation |
| Low-latency text/audio/video stream | `sendRealtimeInput({ ... })` | Concurrent streams; ordering across modalities is not guaranteed |
| Return function results | `sendToolResponse({ functionResponses })` | IDs must match the received calls |
| End connection | `close()` | WebSocket ends; logical session survives only if resumption is configured and handle retained |

### Explicit text turn

```ts
session.sendClientContent({
  turns: [{ role: 'user', parts: [{ text: 'Summarize what you can see.' }] }],
  turnComplete: true,
});
```

### Realtime text

```ts
session.sendRealtimeInput({ text: 'Hello, how are you?' });
```

Realtime input is optimized for responsiveness. Use client content when deterministic ordering and roles matter.

## Callback discipline

`onmessage` should be fast. Decode or enqueue audio, update transcript state, dispatch tool work, and return. Do not await long tools inside a serial audio handler if that blocks further events. A production router should independently handle:

- `serverContent.modelTurn.parts[]` (inspect **all** parts);
- `serverContent.inputTranscription` and `outputTranscription`;
- `serverContent.interrupted`, `generationComplete`, `turnComplete`, `waitingForInput`;
- `toolCall` and `toolCallCancellation`;
- `sessionResumptionUpdate` and `goAway`;
- `usageMetadata`.

See [event-map.md](../reference/event-map.md) and `examples/src/event-router.ts`.

## State machine to model in your app

```text
DISCONNECTED → CONNECTING → READY ⇄ USER_SPEAKING
                               ⇄ MODEL_GENERATING → MODEL_PLAYING
                               ⇄ TOOL_RUNNING
READY / any active state → RECONNECTING → READY
any state → CLOSED
```

Keep these states separate:

- capture muted/unmuted;
- model generation active/complete;
- playback queue active/empty;
- tool task pending/cancelled/completed;
- socket connected/disconnected;
- logical session resumable/not resumable.

Conflating them causes most mute, barge-in, and reconnect bugs.

Sources: [SDK get started](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk), [WebSocket reference](https://ai.google.dev/api/live), [official SDK](https://github.com/googleapis/js-genai).
