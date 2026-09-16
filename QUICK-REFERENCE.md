# Quick reference

## Base config

```ts
const config = {
  responseModalities: [Modality.AUDIO],
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  speechConfig: {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
  },
  contextWindowCompression: { slidingWindow: {} },
  sessionResumption: {},
};
```

## Send

```ts
// PCM16LE mono, 16 kHz, base64
session.sendRealtimeInput({
  audio: { data: base64Pcm, mimeType: 'audio/pcm;rate=16000' },
});

// Realtime text
session.sendRealtimeInput({ text: 'hello' });

// JPEG/PNG frame, max 1 FPS
session.sendRealtimeInput({
  video: { data: base64Jpeg, mimeType: 'image/jpeg' },
});

// Ordered turn/history
session.sendClientContent({
  turns: [{ role: 'user', parts: [{ text: 'hello' }] }],
  turnComplete: true,
});
```

## Mute and VAD

```ts
// Automatic VAD (default): mute/finalize current audio stream
session.sendRealtimeInput({ audioStreamEnd: true });
// Sending the next audio chunk reopens it.

// Manual VAD only (automaticActivityDetection.disabled = true)
session.sendRealtimeInput({ activityStart: {} });
session.sendRealtimeInput({ audio: audioBlob });
session.sendRealtimeInput({ activityEnd: {} });
```

## Receive

```ts
const c = message.serverContent;
for (const part of c?.modelTurn?.parts ?? []) {
  if (part.inlineData?.data) playPcm24k(part.inlineData.data);
}
if (c?.inputTranscription) showUserText(c.inputTranscription.text);
if (c?.outputTranscription) showModelText(c.outputTranscription.text);
if (c?.interrupted) clearPlaybackImmediately();
if (c?.generationComplete) markGenerationDone();
if (c?.turnComplete) commitTurn();
```

## Tools

```ts
if (message.toolCall) {
  const functionResponses = await Promise.all(
    message.toolCall.functionCalls.map(validateExecuteAndFormat),
  );
  session.sendToolResponse({ functionResponses });
}

for (const id of message.toolCallCancellation?.ids ?? []) {
  inFlight.get(id)?.abort();
}
```

Every response must include the received `id` and `name`. Validate, authorize, time out, deduplicate, and handle cancellation.

## Sessions

```ts
if (message.sessionResumptionUpdate?.resumable &&
    message.sessionResumptionUpdate.newHandle) {
  latestHandle = message.sessionResumptionUpdate.newHandle;
}
if (message.goAway) reconnectSoon(latestHandle, message.goAway.timeLeft);
```

## Formats and limits

| Item | Contract |
|---|---|
| Input audio | Raw PCM16LE mono, native 16 kHz |
| Output audio | Raw PCM16LE mono, 24 kHz |
| Video | JPEG/PNG frames, max 1 FPS |
| Base model response | Audio; use output transcript for text |
| Context | 131,072 input tokens on model page (general Live guide rounds to 128k) |
| Uncompressed session | 15 min audio-only; 2 min audio+video |
| Connection | Around 10 min; use resumption |
| Resumption handle | Valid up to 2 hours after last termination (documented) |

## Do not

- Do not put a standard API key in browser code.
- Do not set `thinkingConfig` on `gemini-3.8-live`.
- Do not set proactive audio false or affective dialogue config on 3.8.
- Do not use `audioStreamEnd` with manual VAD.
- Do not execute model-selected tools without allowlist, validation, and authorization.
- Do not assume event ordering or inspect only `parts[0]`.
