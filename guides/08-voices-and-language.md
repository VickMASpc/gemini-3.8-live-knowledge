# Voices and language

Tags: `#voice` `#speechConfig` `#language` `#multilingual`

## Select a voice

```ts
const config = {
  responseModalities: [Modality.AUDIO],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: { voiceName: 'Kore' },
    },
  },
};
```

Voice is setup-time configuration. To change it, reconnect (optionally resume logical context).

Google states that native-audio Live models use the available TTS voices. The currently documented set is:

| Voice | Character | Voice | Character | Voice | Character |
|---|---|---|---|---|---|
| Zephyr | Bright | Puck | Upbeat | Charon | Informative |
| Kore | Firm | Fenrir | Excitable | Leda | Youthful |
| Orus | Firm | Aoede | Breezy | Callirrhoe | Easy-going |
| Autonoe | Bright | Enceladus | Breathy | Iapetus | Clear |
| Umbriel | Easy-going | Algieba | Smooth | Despina | Smooth |
| Erinome | Clear | Algenib | Gravelly | Rasalgethi | Informative |
| Laomedeia | Upbeat | Achernar | Soft | Alnilam | Firm |
| Schedar | Even | Gacrux | Mature | Pulcherrima | Forward |
| Achird | Friendly | Zubenelgenubi | Casual | Vindemiatrix | Gentle |
| Sadachbia | Lively | Sadaltager | Knowledgeable | Sulafat | Warm |

Listen in Google AI Studio before choosing; text labels are only rough guidance. Availability can change while Live remains Preview.

## Language behavior

Native audio automatically detects and adapts to the user’s language and can switch languages naturally. It does not support setting an explicit language code for the response. To force a language, use a direct system instruction:

```ts
systemInstruction: `Respond in Brazilian Portuguese.
You must respond unmistakably in Brazilian Portuguese unless the user explicitly asks for translation.`
```

For accent/persona, specify both accent and language; otherwise the model may satisfy one but not the other.

## Multilingual vs translation

- `gemini-3.8-live` can converse and translate when instructed, useful inside an agent workflow.
- For a dedicated low-latency voice-to-voice translator, Google publishes a separate Live Translate model. Do not assume every translation-specific config field belongs to 3.8 Live.
- For text captions only, prefer `gemini-3.5-transcribe-live`.

## Supported languages

The general capabilities page currently lists 97 supported Live API languages and BCP-47 codes, while some overview copy uses different headline counts for particular features. Treat the model/capabilities page as the detailed reference, test target languages and code-switching with your voice, domain vocabulary, and acoustic environment, and avoid promising unsupported locale fidelity from a headline number alone.

## Voice UX recommendations

- Keep utterances short enough to interrupt naturally.
- Put pronunciation hints and terminology in system instructions, but verify proper nouns empirically.
- Never infer user identity, mood, or protected traits from voice.
- Make it clear the voice is synthetic and provide mute/captions controls.

Sources: [capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [TTS voices](https://ai.google.dev/gemini-api/docs/speech-generation), [best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices).
