# Context and long-running sessions

Tags: `#context` `#compression` `#resumption` `#goAway` `#history`

## Three different continuity mechanisms

| Mechanism | Preserves | Solves |
|---|---|---|
| `sendClientContent` history | Explicit user/model text turns you send | Seeding or restoring chosen history |
| Context window compression | Recent server-side session context via sliding window | Context growth and long audio sessions |
| Session resumption | Logical session state across WebSocket reconnections | Connection lifetime/reset |

They complement one another.

## Add or restore explicit context

```ts
session.sendClientContent({
  turns: [
    { role: 'user', parts: [{ text: 'My name is Sam.' }] },
    { role: 'model', parts: [{ text: 'Hello Sam.' }] },
    { role: 'user', parts: [{ text: 'Continue the onboarding.' }] },
  ],
  turnComplete: true,
});
```

Roles must be explicit. For a large history, provide a carefully generated summary plus critical structured facts instead of replaying every turn. Keep authoritative state (account, cart, workflow step) outside model context and re-inject it as needed.

## Context window compression

```ts
const config = {
  responseModalities: [Modality.AUDIO],
  contextWindowCompression: {
    triggerTokens: '25000',
    slidingWindow: { targetTokens: '8000' },
  },
};
```

The API schema uses int64 fields; SDK versions may accept numbers or strings. Type-check against your installed version. With defaults, compression triggers around 80% of the model context and keeps roughly half the trigger size.

Sliding-window compression discards old content from the beginning, retaining boundaries at a user turn; system instructions remain. Compression can create a temporary latency spike, so do not trigger too frequently.

## Session and connection lifetimes

- Without compression, documented session limits are 15 minutes for audio-only and 2 minutes for audio+video.
- A single WebSocket connection lasts around 10 minutes.
- Compression can extend the logical session; resumption bridges connections.
- Resumption handles are documented as valid for 2 hours after the last session termination.

These are platform behaviors, not timers to hard-code as exact SLAs.

## Session resumption

Enable it from the first connection:

```ts
const config = {
  responseModalities: [Modality.AUDIO],
  sessionResumption: previousHandle ? { handle: previousHandle } : {},
  contextWindowCompression: { slidingWindow: {} },
};
```

Persist only handles marked resumable:

```ts
if (message.sessionResumptionUpdate?.resumable &&
    message.sessionResumptionUpdate.newHandle) {
  latestHandle = message.sessionResumptionUpdate.newHandle;
}
```

At some moments—such as tool execution or generation—the session is not resumable. `newHandle` may be empty. Never replace a known-good handle with an empty/non-resumable update.

## GoAway and reconnect

`message.goAway.timeLeft` warns that the server will disconnect. A robust client:

1. stops accepting a new user turn if insufficient time remains;
2. retains the latest resumable handle;
3. drains/cancels local playback and records tool states;
4. reconnects with jittered backoff and that handle;
5. avoids replaying side effects;
6. informs the user only if continuity is visibly affected.

## Tool calls across reconnects

Logical session resumption does not make external side effects exactly-once. Store call IDs, idempotency keys, execution status, and final result in trusted application state. On ambiguity, query the external system rather than blindly re-executing.

Sources: [session management](https://ai.google.dev/gemini-api/docs/live-api/session-management), [WebSocket reference](https://ai.google.dev/api/live), [best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices).
