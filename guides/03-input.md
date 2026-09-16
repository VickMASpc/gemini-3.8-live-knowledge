# Input: text, audio, images, and video

Tags: `#input` `#audio-input` `#video` `#text` `#pcm` `#javascript`

## Audio contract

- Raw signed 16-bit PCM, little-endian, mono.
- Native input rate: 16 kHz. The service can resample other declared rates, but client-side 16 kHz is preferred.
- MIME type must declare the actual rate: `audio/pcm;rate=16000`.
- Send small chunks. Google’s latency guidance is typically 20–40 ms; 20–100 ms is a practical envelope.
- Do not wrap realtime chunks in WAV headers.

At 16 kHz, mono, 16-bit: bytes per 20 ms = `16000 × 0.020 × 2 = 640`; 40 ms = 1,280 bytes; 100 ms = 3,200 bytes.

```ts
function sendPcm16(session: { sendRealtimeInput(v: unknown): void }, pcm: Uint8Array) {
  session.sendRealtimeInput({
    audio: {
      data: Buffer.from(pcm).toString('base64'),
      mimeType: 'audio/pcm;rate=16000',
    },
  });
}
```

Browser capture commonly starts at 44.1 or 48 kHz float PCM. Resample, clamp to `[-1, 1]`, convert to signed Int16 little-endian, base64-encode, and stream. An `AudioWorklet` is preferable to deprecated `ScriptProcessorNode` for production.

## Text input choices

Low-latency realtime stream:

```ts
session.sendRealtimeInput({ text: 'The user clicked checkout.' });
```

Ordered conversation/history:

```ts
session.sendClientContent({
  turns: [
    { role: 'user', parts: [{ text: 'My order number is A-102.' }] },
    { role: 'model', parts: [{ text: 'I found order A-102.' }] },
  ],
  turnComplete: false,
});
```

Then send a final user turn with `turnComplete: true` when the model should respond. On Gemini 3.8, this interrupts any active generation.

## Image / video input

Live “video” is a sequence of JPEG or PNG image blobs, at most 1 frame/second:

```ts
session.sendRealtimeInput({
  video: {
    data: jpegBytes.toString('base64'),
    mimeType: 'image/jpeg',
  },
});
```

Only send frames when visual context changes or is useful. Gemini 3.8’s default turn coverage includes all video frames, so idle camera streaming consumes context and money.

Set lower media resolution when fine detail is not needed:

```ts
import { MediaResolution } from '@google/genai';

const config = {
  responseModalities: [Modality.AUDIO],
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
};
```

## Concurrent stream ordering

Audio, video, and realtime text are concurrent; cross-stream order is not guaranteed. If “show this image, then ask this exact question” must be deterministic, use client content with ordered parts/turns where supported or add explicit timestamps/correlation in your application logic. Do not assume that two immediate `sendRealtimeInput` calls become a single ordered semantic unit.

## Backpressure

- Bound the client capture queue.
- If the network falls behind, drop stale video frames rather than replaying them late.
- Avoid dropping contiguous speech arbitrarily; pause capture or apply explicit admission control.
- Track send latency and buffered duration, not only byte count.

Sources: [capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices), [WebSocket reference](https://ai.google.dev/api/live).
