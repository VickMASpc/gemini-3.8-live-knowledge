# Use-case patterns

This file maps product needs to the relevant Live features. It is an architectural index, not a claim that every domain is safe without additional policy and human oversight.

| Product | Inputs | Outputs | Tools | Critical configuration |
|---|---|---|---|---|
| Voice customer support | Mic, account context | Audio + both transcripts | Account lookup, ticket create, escalation | Compression, resumption, tool confirmation for writes |
| Shopping assistant | Mic, product images/video | Audio + captions | Search, catalog, cart | Vision frames only on change; authorize cart writes |
| Appointment agent | Mic/text | Audio + transcript | Availability, booking | Blocking/confirmed booking; idempotency key |
| In-app copilot | Mic, realtime UI text/events | Audio | Read state, safe actions | Realtime text plus ordered client content |
| Visual guide / smart-glasses helper | Mic + ≤1 FPS frames | Audio | Search or domain lookup | Low media resolution, aggressive frame dropping |
| Game NPC | Mic/text + scene snapshots | Audio | Game-state reads/actions | Short speech, barge-in, sandboxed narrow tools |
| Tutor / language practice | Mic, optional images | Audio + captions | Curriculum/content retrieval | Persona/language instruction, transcript consent |
| Accessibility voice UI | Mic | Audio + captions | Application actions | Reliable mute, captions, confirmation for consequences |
| Meeting captions / dictation | Mic | Text | Optional export | Use `gemini-3.5-transcribe-live`, not 3.8 agent |
| Voice-to-voice translation | Mic | Translated audio | Usually none | Prefer dedicated Live Translate model; 3.8 only for agentic translation |
| Operations assistant | Mic/text | Audio + transcript | Monitoring, incident data, approved remediation | Read/write separation, audit, confirmation, cancellation |

## Pattern: read-only assistant

Use non-blocking tools with `WHEN_IDLE`, an allowlist, short timeouts, and output redaction. Google Search can coexist with custom reads. This is the lowest-risk tool pattern.

## Pattern: consequential action

Use a two-step workflow:

1. `prepare_action` validates inputs and returns a human-readable summary plus a server-generated confirmation token.
2. The assistant asks the user for explicit confirmation.
3. `commit_action` accepts only that token, is idempotent, rechecks authorization, and records a durable outcome.

Never treat “the model called a function” as user consent.

## Pattern: background lookup while talking

Declare `Behavior.NON_BLOCKING`. Continue conversation while the tool runs, then return with:

- `WHEN_IDLE` for normal results;
- `SILENT` when the result should only influence later reasoning;
- interrupt scheduling only for urgent, time-sensitive information.

## Pattern: push-to-talk

Disable automatic VAD, send `activityStart`, stream PCM chunks, then send `activityEnd`. Keep a pre-roll buffer and at least ~500 ms end-silence logic if client VAD drives button-like behavior.

## Pattern: always-on listening

Use automatic or hybrid VAD, explicit visible mic state, compression, resumption, strict idle/session closure, and cost monitoring. Gemini 3.8 proactive audio is permanently enabled; privacy and billing continue to matter while input is streamed.

## Pattern: multimodal “what am I seeing?”

Send selected JPEG frames at ≤1 FPS, optionally with low media resolution. Avoid a continuous unchanged feed because 3.8’s default turn coverage includes all video frames.

## Pattern: durable conversation

The Live session is not your database. Persist structured application state, consent, tool outcomes, and a concise conversation summary in your own store. Rehydrate with explicit client-content turns; use resumption for short-lived transport continuity, not permanent memory.
