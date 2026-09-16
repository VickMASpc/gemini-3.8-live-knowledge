# Troubleshooting

Tags: `#troubleshooting` `#errors` `#audio` `#tools` `#sessions`

| Symptom | Likely cause | Fix |
|---|---|---|
| Setup rejects text response | `gemini-3.8-live` is native-audio response | Use `Modality.AUDIO` plus `outputAudioTranscription` |
| No response after `sendClientContent` | Turn left incomplete | Send `turnComplete: true` when ready; note this interrupts active generation |
| Audio sounds fast/slow/noisy | Wrong sample rate, endian, bit depth, or WAV header | Input PCM16LE 16 kHz; output PCM16LE 24 kHz; raw frames only |
| First syllable clipped | VAD prefix too small or manual VAD lacks pre-roll | Increase `prefixPaddingMs` or keep a client pre-roll buffer |
| User speech fragmented | `silenceDurationMs` / client end threshold too low | Use ~500–800 ms as a starting range |
| Agent keeps speaking after interruption | Client playback queue not cleared | Stop scheduled nodes and discard all queued audio on `interrupted` |
| Muting leaves turn hanging | Capture stopped without protocol finalization | Auto VAD: send `audioStreamEnd`; manual VAD: send `activityEnd` |
| Unmute does nothing | Capture track remains disabled / worklet stopped | Re-enable capture and send fresh audio; it reopens auto-VAD stream |
| Tool call hangs conversation | Blocking call never received a response | Always return success/error with matching `id`; add timeout |
| Wrong tool executes | Dynamic dispatch / missing allowlist | Allowlist names and schema-validate args |
| Tool runs twice | Reconnect/retry ambiguity | Deduplicate by call ID/idempotency key; query external outcome |
| Tool result interrupts at bad time | Wrong non-blocking scheduling | Use `WHEN_IDLE` or `SILENT`; reserve interrupt scheduling for urgent results |
| Cancelled tool still made a change | Cancellation raced irreversible side effect | Prepare/confirm/commit, idempotency, compensation, truthful outcome tracking |
| Context/cost grows quickly | Long raw-audio history and transcripts | Enable compression, summarize state, disable unneeded transcripts, close idle sessions |
| Socket closes around 10 minutes | Normal connection lifetime | Handle `goAway`; reconnect with latest resumable handle |
| Resume loses latest state | Saved an empty/non-resumable handle or resumed during generation/tool call | Retain last known-good handle only; persist external tool state separately |
| Browser key leaked | Standard API key included in frontend | Revoke/rotate it; mint constrained ephemeral tokens server-side |
| Some audio/content missing | Code inspected only the first part | Iterate every `modelTurn.parts[]` item |
| Events look out of order | Realtime modalities/transcripts are independent streams | Correlate by local turn, treat `turnComplete` as commit boundary |
| `thinkingConfig` errors | Unsupported on base 3.8 Live | Remove it or use the Extended Thinking model |
| Proactivity/affective config errors | 3.8 has permanent proactive audio and removed affective config | Remove `proactiveAudio: false` and `enableAffectiveDialog` |

## Debug event logger

Log structure, not content:

```ts
function eventKind(m: any): string[] {
  return [
    m.setupComplete && 'setupComplete',
    m.serverContent && 'serverContent',
    m.toolCall && 'toolCall',
    m.toolCallCancellation && 'toolCallCancellation',
    m.goAway && 'goAway',
    m.sessionResumptionUpdate && 'sessionResumptionUpdate',
    m.usageMetadata && 'usageMetadata',
  ].filter(Boolean) as string[];
}
```

Capture SDK version, model, config hash, timestamps, event kinds, close code/reason, buffer depth, and call IDs. Redact transcripts, binary data, secrets, and tool arguments.

## Escalation packet

When filing an SDK/API issue, include a minimal reproduction, exact SDK/runtime versions, model, sanitized setup config, close/error code and reason, event timeline, expected/actual behavior, and whether raw WebSocket or SDK is used. Never include API keys or private audio.

Sources: [capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [session management](https://ai.google.dev/gemini-api/docs/live-api/session-management), [official SDK issues](https://github.com/googleapis/js-genai/issues).
