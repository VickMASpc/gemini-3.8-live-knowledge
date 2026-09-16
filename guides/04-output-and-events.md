# Output audio and server events

Tags: `#output` `#audio-output` `#events` `#playback` `#javascript`

## Audio output contract

Gemini 3.8 Live produces raw signed 16-bit PCM, little-endian, mono, **24 kHz**. Audio arrives base64-encoded in `serverContent.modelTurn.parts[].inlineData.data` (the SDK may also expose convenience `data` fields in examples).

Always iterate every part:

```ts
function readModelParts(message: any) {
  const parts = message.serverContent?.modelTurn?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) enqueuePcm24k(part.inlineData.data);
    if (part.text) appendText(part.text);
    if (part.executableCode) inspectGroundingCode(part.executableCode);
    if (part.codeExecutionResult) inspectGroundingResult(part.codeExecutionResult);
  }
}
```

A single event can contain multiple parts. Reading only `parts[0]` loses output.

## Playback architecture

1. Decode base64 to bytes.
2. Interpret as Int16 little-endian samples.
3. Convert to float samples if the Web Audio API needs them (`sample / 32768`).
4. Schedule at 24 kHz using an `AudioWorklet` or a bounded jitter buffer.
5. Retain handles to queued/scheduled playback so interruption can cancel all unplayed audio.

Generation is faster than real-time. The client is responsible for real-time playout and buffering.

## Completion signals are different

| Event | Meaning | Typical UI action |
|---|---|---|
| `generationComplete` | Model finished generating bytes | Stop “generating”; playback may continue |
| `turnComplete` | Model turn is fully complete | Session is ready for the next response cycle |
| `interrupted` | User/client input cut off generation | Immediately stop playback and empty queued audio |
| `waitingForInput` | Model expects more input | Keep capture active / show listening state |

When real-time playback assumptions apply, `turnComplete` can follow `generationComplete` after a delay. Do not use the first as a substitute for the second.

## Independent event streams

Input transcripts, output transcripts, model parts, usage, and lifecycle messages can arrive independently. There is no guaranteed exact ordering between input transcription and other server messages. Output transcript ordering is closer to corresponding audio, but your UI should still accumulate by turn and treat `turnComplete` as the commit boundary.

## Interruption rule

```ts
if (message.serverContent?.interrupted) {
  audioPlayer.stopNow();
  audioPlayer.clearQueue();
  transcriptUi.markModelTurnInterrupted();
}
```

The server discards pending generation and may cancel tool calls. Audio already delivered to the client cannot be “undelivered”; clearing client playback is mandatory to make barge-in sound correct.

## Usage and observability

Inspect `message.usageMetadata` whenever present. Log event type, turn ID from your app, monotonic timestamp, queued playback milliseconds, tool call IDs, resumption state, and close code/reason. Never log raw audio, transcripts, tool arguments, or credentials by default.

Sources: [WebSocket reference](https://ai.google.dev/api/live), [capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices).
