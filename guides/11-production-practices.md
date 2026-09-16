# Production practices: latency, cost, and reliability

Tags: `#production` `#latency` `#cost` `#reliability` `#observability`

## Latency checklist

- Resample microphone audio to PCM16LE mono 16 kHz before sending.
- Stream 20–40 ms chunks; avoid one-second client buffers.
- Use direct client-to-Gemini media with ephemeral tokens when architecture permits.
- Use hybrid VAD to preserve speech onset and finalize promptly.
- Decode/play audio incrementally with a small bounded jitter buffer.
- Clear playback immediately on `interrupted`.
- Keep `onmessage` non-blocking; dispatch tools/audio processing independently.
- Drop stale video frames and send no more than 1 FPS.

## Context and cost

Live billing is token-based and context compounds: each turn reprocesses retained context. Native audio history accumulates at roughly 25 tokens/second. Input/output transcription adds text-output token charges on top of audio charges.

Use:

```ts
contextWindowCompression: {
  triggerTokens: '25000',
  slidingWindow: { targetTokens: '8000' },
}
```

Tune from observed quality, cost, and compression latency. Keep business state outside the transcript and re-inject a compact authoritative summary.

Gemini 3.8 proactive audio is permanently enabled. Current billing guidance says input is charged while the Live API is listening, with output charged when it responds. Stop sending unused capture and close idle sessions.

## Prompt/system-instruction shape

Order guidance as:

1. persona and role;
2. conversational rules and loops;
3. explicit tool-call conditions;
4. guardrails and escalation.

Give the model an initial user prompt if it should greet first; Live expects input before responding. Prefer one clear persona and concise chained instructions over a multi-page ambiguous prompt.

## Reliability checklist

- Enable context compression and session resumption from the initial setup.
- Store only a resumable, non-empty handle.
- Handle `goAway`, close code/reason, and reconnect with capped exponential backoff plus jitter.
- Put timeouts, concurrency limits, idempotency, and cancellation on tools.
- Distinguish `generationComplete` from `turnComplete`.
- Bound capture, playback, transcript, and tool queues.
- Surface degraded states: reconnecting, muted, tool failed, captions unavailable.
- Test packet loss, device changes, background tabs, long silences, double clicks, and interruptions during writes.

## Metrics worth capturing

- connect/setup latency;
- first input audio → first output audio latency;
- end of speech → first output latency;
- audio queued/underrun milliseconds;
- interruption → playback stopped latency;
- tool call latency/error/cancellation/duplicate rate;
- reconnect success and resumption availability;
- token usage per turn/session;
- transcript finalization latency.

Use correlation IDs and monotonic timestamps. Avoid recording raw user content unless explicitly required and consented.

## Model/config versioning

Store alongside releases:

- model ID;
- `@google/genai` exact version;
- setup config hash;
- system-instruction version;
- tool-schema version.

The API is Preview even though the model ID is stable. Test upgrades in staging with recorded synthetic fixtures—not private production audio.

Sources: [best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices), [session management](https://ai.google.dev/gemini-api/docs/live-api/session-management), [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live).
