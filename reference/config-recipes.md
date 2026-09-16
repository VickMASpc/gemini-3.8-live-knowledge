# Configuration recipes

All snippets belong inside `config` passed to `ai.live.connect` unless noted.

## Voice agent with both captions

```ts
{
  responseModalities: [Modality.AUDIO],
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  speechConfig: {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
  },
}
```

## Long-running resumable voice agent

```ts
{
  responseModalities: [Modality.AUDIO],
  contextWindowCompression: {
    triggerTokens: '25000',
    slidingWindow: { targetTokens: '8000' },
  },
  sessionResumption: previousHandle ? { handle: previousHandle } : {},
}
```

## Tuned automatic VAD

```ts
{
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
}
```

## Push-to-talk/manual VAD

```ts
{
  responseModalities: [Modality.AUDIO],
  realtimeInputConfig: {
    automaticActivityDetection: { disabled: true },
  },
}
```

Send `activityStart`, chunks, `activityEnd`; never `audioStreamEnd`.

## Tools + Google Search

```ts
{
  responseModalities: [Modality.AUDIO],
  tools: [
    { googleSearch: {} },
    { functionDeclarations: [getOrderStatusDeclaration] },
  ],
}
```

## Low-resolution vision

```ts
{
  responseModalities: [Modality.AUDIO],
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
}
```

## Dedicated transcription

```ts
// model: 'gemini-3.5-transcribe-live'
{
  responseModalities: [Modality.TEXT],
  inputAudioTranscription: {
    languageCodes: [],
    customVocabulary: ['Acme FluxDrive'],
    mode: 'VERBATIM',
  },
}
```

## Invalid for base Gemini 3.8 Live

```ts
// Avoid:
{
  responseModalities: [Modality.TEXT],
  thinkingConfig: { thinkingLevel: 'low' },
  enableAffectiveDialog: true,
  proactivity: { proactiveAudio: false },
}
```

Use `gemini-3.8-live-extended-thinking` for configurable thinking. Do not port old affective/proactivity flags blindly.
