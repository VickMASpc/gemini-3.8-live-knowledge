# Security and deployment

Tags: `#security` `#ephemeral-token` `#browser` `#deployment` `#privacy`

## Never expose a standard API key

Standard API keys belong only in trusted server environments. For a browser/mobile app connecting directly to Gemini, your authenticated backend must mint a short-lived ephemeral token.

## Ephemeral-token flow

1. User authenticates to your backend.
2. Backend checks entitlement/rate limits.
3. Backend uses its standard API key to create an ephemeral token.
4. Backend returns only `token.name` to that user.
5. Client connects directly to Live API with the token.
6. Client sends sensitive tool requests to your backend, which re-authorizes and executes them.

Backend minting example:

```ts
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const token = await ai.authTokens.create({
  config: {
    uses: 1,
    expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
    newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
    liveConnectConstraints: {
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        sessionResumption: {},
      },
    },
  },
});
```

By documented defaults, clients have about 1 minute to start a new session and 30 minutes to use the connection; set the shortest practical values. A constrained token can lock model/config fields and keep server-owned instructions out of client control.

Client:

```ts
const ai = new GoogleGenAI({ apiKey: ephemeralToken });
```

Ephemeral tokens are Live-only and use the `v1beta` endpoint. Check the installed SDK’s current requirements; raw WebSocket clients pass the token using the documented access-token query parameter or `Authorization: Token ...`.

## Server relay vs direct client

| Concern | Server relay | Direct with ephemeral token |
|---|---|---|
| Media latency | Higher | Lower |
| Standard key exposure | Safe | Safe if minting is correct |
| Bandwidth through backend | High | Low |
| Central media inspection/control | Easy | Harder |
| Tool secrets/private networks | Natural | Use a separate authenticated backend call |

## Tool-security boundary

Even in direct mode, never let browser code be the sole authority for purchases, admin actions, protected data, or external credentials. The backend must authenticate the user, validate arguments, enforce authorization/business rules, apply rate limits, create idempotency records, and return a minimal result.

## Privacy and abuse controls

- Explicit microphone/camera indicators and consent.
- Mute control that actually stops capture.
- Data minimization and retention/deletion policy for audio/transcripts.
- Redaction in logs; never log tokens or full tool payloads by default.
- Origin checks, CSRF protection, and per-user quotas on token minting.
- Content safety and human escalation appropriate to the domain.
- Do not trust model-generated URLs, commands, identifiers, or claims.

Sources: [ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens), [overview](https://ai.google.dev/gemini-api/docs/live-api), [WebSocket reference](https://ai.google.dev/api/live).
