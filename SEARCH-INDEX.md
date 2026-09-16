# Search index

Use `rg -n -i "keyword" .` from the workspace root.

| Task / question | Search terms | Primary file |
|---|---|---|
| Start a session | `live.connect callbacks responseModalities` | `guides/02-javascript-session.md` |
| Send microphone audio | `PCM 16000 sendRealtimeInput` | `guides/03-input.md` |
| Play model audio | `inlineData 24000 playback queue` | `guides/04-output-and-events.md` |
| Show captions | `inputTranscription outputTranscription interim` | `guides/05-transcription.md` |
| Mute/unmute microphone | `audioStreamEnd mute reopen` | `guides/06-mute-vad-interruption.md` |
| Push-to-talk | `activityStart activityEnd manual VAD` | `guides/06-mute-vad-interruption.md` |
| Let user interrupt model | `barge-in interrupted clear playback` | `guides/06-mute-vad-interruption.md` |
| Define and execute functions | `functionDeclarations toolCall sendToolResponse` | `guides/07-tool-calling.md` |
| Async tool result behavior | `NON_BLOCKING scheduling INTERRUPT WHEN_IDLE SILENT` | `guides/07-tool-calling.md` |
| Cancel an in-flight tool | `toolCallCancellation AbortController compensation` | `guides/07-tool-calling.md` |
| Change voice | `speechConfig prebuiltVoiceConfig voiceName` | `guides/08-voices-and-language.md` |
| Force response language | `systemInstruction unmistakably language` | `guides/08-voices-and-language.md` |
| Add prior conversation | `sendClientContent explicit roles history` | `guides/09-context-and-sessions.md` |
| Keep sessions long-running | `contextWindowCompression slidingWindow` | `guides/09-context-and-sessions.md` |
| Reconnect without losing context | `sessionResumption newHandle goAway` | `guides/09-context-and-sessions.md` |
| Browser security | `ephemeral token liveConnectConstraints v1beta` | `guides/10-security-and-deployment.md` |
| Reduce latency | `20ms 40ms resample buffer` | `guides/11-production-practices.md` |
| Diagnose missing/overlapping audio | `interrupted generationComplete turnComplete` | `guides/12-troubleshooting.md` |
| Raw server message shape | `setupComplete serverContent toolCall goAway` | `reference/event-map.md` |
| Copy a config | `recipe` plus feature name | `reference/config-recipes.md` |
| Choose a product pattern | `customer support shopping appointment game tutor accessibility` | `USE-CASES.md` |
| Run a browser implementation | `HTML CSS JavaScript browser-demo AudioWorklet` | `browser-demo/README.md` |
| Structure production browser JS | `modules DOM CSP cleanup testing matrix` | `guides/13-browser-javascript.md` |

## Tags used inside guides

`#javascript` `#typescript` `#audio-input` `#audio-output` `#video` `#transcription` `#mute` `#vad` `#barge-in` `#tool-calling` `#voice` `#context` `#resumption` `#security` `#cost` `#troubleshooting`
