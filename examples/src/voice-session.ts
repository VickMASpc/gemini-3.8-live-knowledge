import { appendFileSync, rmSync } from 'node:fs';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY in the server environment.');

const outputPath = new URL('../response.pcm', import.meta.url);
rmSync(outputPath, { force: true });

let resolveTurn: (() => void) | undefined;
const turnFinished = new Promise<void>((resolve) => { resolveTurn = resolve; });

function onMessage(message: LiveServerMessage): void {
  const content = message.serverContent;
  for (const part of content?.modelTurn?.parts ?? []) {
    if (part.inlineData?.data) {
      appendFileSync(outputPath, Buffer.from(part.inlineData.data, 'base64'));
    }
  }
  if (content?.inputTranscription?.text) {
    console.log('User:', content.inputTranscription.text);
  }
  if (content?.outputTranscription?.text) {
    console.log('Gemini:', content.outputTranscription.text);
  }
  if (content?.interrupted) console.log('[interrupted]');
  if (content?.turnComplete) resolveTurn?.();
}

const ai = new GoogleGenAI({ apiKey });
const session = await ai.live.connect({
  model: 'gemini-3.8-live',
  config: {
    responseModalities: [Modality.AUDIO],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
    },
    contextWindowCompression: { slidingWindow: {} },
    sessionResumption: {},
  },
  callbacks: {
    onopen: () => console.log('Live session opened'),
    onmessage: onMessage,
    onerror: (event) => console.error('Live error', event),
    onclose: (event) => console.log('Live session closed', event.code, event.reason),
  },
});

session.sendClientContent({
  turns: [{ role: 'user', parts: [{ text: 'Introduce yourself in one short sentence.' }] }],
  turnComplete: true,
});

await turnFinished;
session.close();
console.log('Wrote raw PCM16LE mono 24 kHz audio to examples/response.pcm');
