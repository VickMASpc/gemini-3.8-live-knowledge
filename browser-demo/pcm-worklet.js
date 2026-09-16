class Pcm16Downsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sourceSamples = [];
    this.targetRate = 16000;
    this.sourceChunkSize = Math.max(128, Math.round(sampleRate * 0.04));
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const sample of channel) this.sourceSamples.push(sample);

    while (this.sourceSamples.length >= this.sourceChunkSize) {
      const source = this.sourceSamples.splice(0, this.sourceChunkSize);
      const targetLength = Math.max(1, Math.round(source.length * this.targetRate / sampleRate));
      const pcm = new Int16Array(targetLength);
      const ratio = source.length / targetLength;
      for (let index = 0; index < targetLength; index += 1) {
        const start = Math.floor(index * ratio);
        const end = Math.max(start + 1, Math.floor((index + 1) * ratio));
        let sum = 0;
        for (let sourceIndex = start; sourceIndex < end && sourceIndex < source.length; sourceIndex += 1) {
          sum += source[sourceIndex];
        }
        const normalized = Math.max(-1, Math.min(1, sum / (end - start)));
        pcm[index] = normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor('pcm16-downsampler', Pcm16Downsampler);
