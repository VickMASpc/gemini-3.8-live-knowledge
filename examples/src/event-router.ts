import type { LiveServerMessage } from '@google/genai';

export interface LiveSinks {
  enqueueAudio(base64Pcm24k: string): void;
  clearPlayback(): void;
  inputTranscript(text: string, languageCode?: string): void;
  outputTranscript(text: string, languageCode?: string): void;
  onToolCall(message: NonNullable<LiveServerMessage['toolCall']>): void;
  cancelTools(ids: string[]): void;
  saveResumeHandle(handle: string): void;
  onGoAway(timeLeft: string | undefined): void;
  onTurnComplete(): void;
  onGenerationComplete(): void;
}

export function routeLiveMessage(message: LiveServerMessage, sinks: LiveSinks): void {
  const content = message.serverContent;

  for (const part of content?.modelTurn?.parts ?? []) {
    if (part.inlineData?.data) sinks.enqueueAudio(part.inlineData.data);
  }

  if (content?.inputTranscription?.text) {
    sinks.inputTranscript(
      content.inputTranscription.text,
      content.inputTranscription.languageCode,
    );
  }
  if (content?.outputTranscription?.text) {
    sinks.outputTranscript(
      content.outputTranscription.text,
      content.outputTranscription.languageCode,
    );
  }
  if (content?.interrupted) sinks.clearPlayback();
  if (content?.generationComplete) sinks.onGenerationComplete();
  if (content?.turnComplete) sinks.onTurnComplete();

  if (message.toolCall) sinks.onToolCall(message.toolCall);
  if (message.toolCallCancellation?.ids) {
    sinks.cancelTools(message.toolCallCancellation.ids);
  }

  const update = message.sessionResumptionUpdate;
  if (update?.resumable && update.newHandle) sinks.saveResumeHandle(update.newHandle);

  if (message.goAway) sinks.onGoAway(message.goAway.timeLeft);
}
