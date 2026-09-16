import type { Session } from '@google/genai';

/** Protocol/UI coordination only. Feed PCM chunks from an AudioWorklet separately. */
export class MicController {
  constructor(
    private readonly session: Session,
    private readonly track: MediaStreamTrack,
    private readonly manualVad = false,
  ) {}

  beginSpeech(): void {
    this.track.enabled = true;
    if (this.manualVad) this.session.sendRealtimeInput({ activityStart: {} });
  }

  sendPcm16(base64Pcm: string): void {
    if (!this.track.enabled) return;
    this.session.sendRealtimeInput({
      audio: { data: base64Pcm, mimeType: 'audio/pcm;rate=16000' },
    });
  }

  endSpeechOrMute(): void {
    this.track.enabled = false;
    if (this.manualVad) {
      this.session.sendRealtimeInput({ activityEnd: {} });
    } else {
      this.session.sendRealtimeInput({ audioStreamEnd: true });
    }
  }
}
