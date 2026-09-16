# Event and message map

The SDK uses camelCase. Raw REST/WebSocket documentation may show the same concepts in camelCase JSON and language SDKs may transform names.

## Client → server

| SDK method / payload | Purpose | Constraints |
|---|---|---|
| `live.connect({ model, config, callbacks })` | Open and set up session | Setup immutable during open connection |
| `sendClientContent({ turns, turnComplete })` | Ordered context/turns | Explicit `user`/`model` roles; completing interrupts generation on 3.8 |
| `sendRealtimeInput({ audio })` | Audio stream | Blob with PCM MIME rate |
| `sendRealtimeInput({ video })` | Image/video frame stream | JPEG/PNG; ≤1 FPS |
| `sendRealtimeInput({ text })` | Realtime text stream | Concurrent ordering semantics |
| `sendRealtimeInput({ audioStreamEnd: true })` | End/pause audio under automatic VAD | New audio reopens stream |
| `sendRealtimeInput({ activityStart: {} })` | Manual activity start | Only with automatic VAD disabled |
| `sendRealtimeInput({ activityEnd: {} })` | Manual activity end | Only with automatic VAD disabled |
| `sendToolResponse({ functionResponses })` | Return tool results | Match each received call `id` |
| `close()` | End socket | Does not itself persist logical context |

## Server → client top-level messages

Apart from optional `usageMetadata`, a server message normally contains one top-level message type.

| Field | Meaning | Required client action |
|---|---|---|
| `setupComplete` | Setup accepted | SDK connect resolves after setup |
| `serverContent` | Generated content/lifecycle/transcripts | Route all subfields and parts |
| `toolCall.functionCalls[]` | Execute declared functions | Validate, authorize, run, reply with matching IDs |
| `toolCallCancellation.ids[]` | Calls should be cancelled | Abort if possible; compensate/record if already committed |
| `goAway.timeLeft` | Server will disconnect | Prepare reconnect/resume |
| `sessionResumptionUpdate` | New resumability state | Save only non-empty handle when `resumable` |
| `usageMetadata` | Token accounting | Record for cost/diagnostics |

## `serverContent`

| Field | Semantics |
|---|---|
| `modelTurn.parts[]` | Audio/text/other generated parts; process every element |
| `generationComplete` | Model finished generating; playback may remain |
| `turnComplete` | Model turn complete / next response awaits input |
| `interrupted` | Generation was interrupted; stop/clear playback |
| `inputTranscription` | Final input audio transcript; independent ordering |
| `interimInputTranscription` | Speculative partial input transcript (dedicated transcription flow) |
| `outputTranscription` | Model audio transcript |
| `waitingForInput` | Model is waiting for continued user input |
| `groundingMetadata` | Search grounding metadata when applicable |

## Tool call shape

```ts
type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

type ToolResponse = {
  id: string;
  name: string;
  response: Record<string, unknown>;
};
```

Use actual exported SDK types in application code; these simplified shapes are for mental lookup.

Canonical schema: [Live WebSocket API reference](https://ai.google.dev/api/live).
