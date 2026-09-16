# TypeScript examples

These examples target `@google/genai` 2.22.x and Node.js 22+. They are small reference programs, not a complete production UI.

## Setup

```bash
npm install
Copy-Item .env.example .env
# Set GEMINI_API_KEY in your shell or load .env with your preferred mechanism.
npm run typecheck
```

Run a network example only after setting a real server-side key:

```bash
npm run voice
npm run tools
```

`token-server.ts` demonstrates the trusted backend half of browser-direct authentication. Add your own web framework, user authentication, CSRF protection, origin validation, and rate limiting before exposing it.

## Files

| File | Purpose |
|---|---|
| `src/voice-session.ts` | Text prompt → native audio/transcripts; writes raw PCM output |
| `src/tool-session.ts` | Allowlisted, validated, cancelable tool loop |
| `src/event-router.ts` | Exhaustive-ish event routing skeleton |
| `src/mic-control.ts` | Browser capture/mute/VAD control pattern |
| `src/token-server.ts` | Mint a constrained ephemeral token on a trusted server |

The voice example writes `response.pcm` (raw 24 kHz PCM16LE mono), not WAV. Import it into an audio editor with those parameters or wrap it with a WAV header in application code.
