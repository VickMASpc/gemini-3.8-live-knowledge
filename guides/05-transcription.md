# Transcription

Tags: `#transcription` `#captions` `#stt` `#inputTranscription` `#outputTranscription`

## Voice-agent transcripts (`gemini-3.8-live`)

Enable either or both transcript directions at session setup:

```ts
const config = {
  responseModalities: [Modality.AUDIO],
  inputAudioTranscription: {},   // user speech → text
  outputAudioTranscription: {},  // model speech → text
};
```

Handle events independently:

```ts
const content = message.serverContent;
if (content?.inputTranscription?.text) {
  commitUserText(content.inputTranscription.text);
}
if (content?.outputTranscription?.text) {
  appendModelCaption(content.outputTranscription.text);
}
```

The output language is inferred from model speech. Gemini 3.8 does not accept an explicit output language code for native audio; control language in the system instruction.

Input/output transcripts cost extra text output tokens in addition to native audio token billing. Keep them enabled when needed for captions, logging (with consent), accessibility, retrieval, or audit—not merely because they are convenient.

## Dedicated Live Transcription (`gemini-3.5-transcribe-live`)

Use this separate model when the product is primarily STT rather than a conversational agent:

```ts
const session = await ai.live.connect({
  model: 'gemini-3.5-transcribe-live',
  config: {
    responseModalities: [Modality.TEXT],
    inputAudioTranscription: {
      languageCodes: [], // automatic language detection
    },
  },
  callbacks: { onmessage: handleTranscript, onerror, onclose },
});
```

The dedicated model emits:

- `serverContent.interimInputTranscription`: fast, speculative, frequently replaced;
- `serverContent.inputTranscription`: finalized, authoritative segment.

```ts
function handleTranscript(message: any) {
  const c = message.serverContent;
  if (c?.interimInputTranscription) {
    captions.replaceDraft(c.interimInputTranscription.text);
  }
  if (c?.inputTranscription) {
    captions.commit(c.inputTranscription.text, c.inputTranscription.languageCode);
  }
}
```

Do not append interim updates as independent lines; replace the current draft until a final segment arrives.

## STT configuration features

The WebSocket schema exposes these `AudioTranscriptionConfig` fields:

| Field | Purpose | Caveat |
|---|---|---|
| `languageCodes` | BCP-47 language hints; empty/omitted auto-detects | Use only when known; incorrect hints can hurt |
| `customVocabulary` | Bias proper nouns, products, jargon | Bias, not a guaranteed spelling rule |
| `wordTimestamp` | Word-level times | Incompatible with SMART mode |
| `diarization` | Speaker separation | Incompatible with SMART mode |
| `mode: 'VERBATIM'` | Literal transcript | Keeps fillers/restarts |
| `mode: 'SMART'` | Cleans disfluencies, grammar, formatting, minor self-corrections | Not verbatim; no timestamps/diarization |

## Audio for transcription

Send raw PCM16LE mono at 16 kHz. Google’s transcription guide recommends about 100 ms chunks (roughly 1,024–2,048 frames is also documented), while the general low-latency Live guide favors 20–40 ms. Choose based on latency/overhead and verify with real speech/network tests. Signal finalization with `audioStreamEnd: true` when automatic VAD is enabled.

## Data handling

Transcripts can contain sensitive personal data. Obtain consent where required, minimize retention, redact before logs/analytics, encrypt at rest, and define deletion policies. Keep raw audio and transcripts under separate retention controls.

Sources: [Live transcription](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe), [capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [API schema](https://ai.google.dev/api/live).
