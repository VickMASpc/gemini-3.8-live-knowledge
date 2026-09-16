# Mute, VAD, push-to-talk, and interruption

Tags: `#mute` `#vad` `#barge-in` `#audioStreamEnd` `#activityStart` `#activityEnd`

## “Mute” is two operations

1. Stop/disable local microphone capture so no more audio samples leave the device.
2. Tell the Live session that the current input stream/activity ended, using the signal appropriate to the configured VAD mode.

### Automatic VAD (default)

```ts
function mute(session: any, micTrack?: MediaStreamTrack) {
  if (micTrack) micTrack.enabled = false;
  session.sendRealtimeInput({ audioStreamEnd: true });
}

function unmute(micTrack?: MediaStreamTrack) {
  if (micTrack) micTrack.enabled = true;
  // No reopen message. Sending the next audio chunk reopens the stream.
}
```

Send `audioStreamEnd` when audio pauses for more than about a second or the microphone is switched off; it flushes cached audio and can finalize the turn. It is not a permanent session close.

### Manual VAD / push-to-talk

Configure once:

```ts
const config = {
  responseModalities: [Modality.AUDIO],
  realtimeInputConfig: {
    automaticActivityDetection: { disabled: true },
  },
};
```

Then bracket audio:

```ts
session.sendRealtimeInput({ activityStart: {} });
// send audio chunks...
session.sendRealtimeInput({ activityEnd: {} });
```

Do **not** send `audioStreamEnd` in manual-VAD mode. The start/end signals are valid only when automatic detection is disabled.

## Hybrid VAD (recommended for low-latency natural speech)

Leave server VAD enabled, use client VAD only to detect likely end-of-speech, then send `audioStreamEnd: true`. Server VAD retains prefix buffering and acts as a fallback; the client end signal avoids waiting for the full server silence timeout.

## Automatic VAD tuning

```ts
import { EndSensitivity, StartSensitivity } from '@google/genai';

const config = {
  responseModalities: [Modality.AUDIO],
  realtimeInputConfig: {
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
      endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
      prefixPaddingMs: 100,
      silenceDurationMs: 700,
    },
  },
};
```

- `prefixPaddingMs`: look-back included before committed speech; zero risks clipping first syllables.
- `silenceDurationMs`: silence needed to end a turn. Google recommends roughly 500–800 ms for balanced quality; internal default is around 800 ms.
- High start sensitivity detects speech more readily but increases false positives.
- Low end sensitivity ends speech less often and tolerates pauses.

The 100 ms/700 ms values above are a starting point, not universal defaults.

For fully manual VAD, retain a pre-roll buffer and avoid aggressive end thresholds. Google recommends at least 500 ms of silence; otherwise natural pauses fragment utterances.

## Barge-in

Default activity handling is `START_OF_ACTIVITY_INTERRUPTS`: user activity interrupts model generation. When `serverContent.interrupted` arrives:

```ts
if (message.serverContent?.interrupted) {
  player.stopAllScheduledSources();
  player.clearDecodedAndEncodedQueues();
  ui.markInterrupted();
}
```

The server cannot clear audio already buffered locally. If the client only stops accepting new chunks, the model may keep audibly talking over the user.

Use `NO_INTERRUPTION` only for experiences where model speech must finish; it harms natural turn-taking for assistants.

## Tool cancellation during interruption

Interruption may produce `toolCallCancellation.ids`. Abort cancelable work, but treat irreversible effects carefully: a cancellation notification can arrive after a side effect already happened. Use idempotency keys, transactional boundaries, and compensating actions.

Sources: [capabilities/VAD](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [WebSocket reference](https://ai.google.dev/api/live), [best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices).
