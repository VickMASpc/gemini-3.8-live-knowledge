/* Live API audio: microphone PCM16 @ 16kHz; playback PCM16 @ 24kHz.
   No third-party microphone processor, no hidden media uploads. */
export function uint8ToBase64(bytes) {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(binary);
}
export function base64ToBytes(base64) {
  const binary = atob(base64), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
export function rawPcmToWav(chunks, rate = 24000) {
  const bytes = chunks.reduce((sum, a) => sum + a.length, 0);
  const buffer = new ArrayBuffer(44 + bytes), view = new DataView(buffer);
  const str = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, bytes, true);
  let offset = 44;
  for (const chunk of chunks) { new Uint8Array(buffer, offset, chunk.length).set(chunk); offset += chunk.length; }
  return new Blob([buffer], {type:'audio/wav'});
}
export class AudioPlayer {
  constructor() { this.ctx = null; this.nextTime = 0; this.nodes = new Set(); }
  async prepare() {
    if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AudioContext();
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }
  play(base64) {
    if (!this.ctx) return;
    const bytes = base64ToBytes(base64);
    if (bytes.length < 2) return;
    const aligned = bytes.length - (bytes.length % 2);
    const view = new DataView(bytes.buffer, bytes.byteOffset, aligned);
    const length = aligned / 2;
    const audio = this.ctx.createBuffer(1, length, 24000);
    const pcm = audio.getChannelData(0);
    for (let i = 0; i < length; i++) pcm[i] = view.getInt16(i * 2, true) / 32768;
    const node = this.ctx.createBufferSource(); node.buffer = audio; node.connect(this.ctx.destination);
    this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + .045);
    node.start(this.nextTime);
    this.nextTime += audio.duration;
    this.nodes.add(node);
    node.onended = () => this.nodes.delete(node);
  }
  interrupt() {
    for (const node of this.nodes) { try { node.stop(); } catch {} }
    this.nodes.clear();
    this.nextTime = this.ctx?.currentTime || 0;
  }
  async dispose() { this.interrupt(); if (this.ctx) await this.ctx.close().catch(()=>{}); this.ctx=null; }
}
export class MicrophoneStream {
  constructor(onAudio) {this.onAudio = onAudio;this.stream = null;this.ctx = null;this.source = null;this.processor = null;this.silent = null;this.url = null;}
  async start() {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,noiseSuppression:true,echoCancellation:true,autoGainControl:true}});
    this.ctx = new AudioContext({latencyHint:'interactive'});
    await this.ctx.resume();
    const code = `class Pcm16Worklet extends AudioWorkletProcessor {
      constructor(){super();this.samples=[];this.rate=sampleRate;}
      process(inputs){const input=inputs[0]?.[0];if(!input)return true;
        for(let i=0;i<input.length;i++)this.samples.push(input[i]);
        const segment=Math.ceil(this.rate*.06);
        while(this.samples.length>=segment){const src=this.samples.splice(0,segment);const count=Math.max(1,Math.round(src.length*16000/this.rate));
          const pcm=new Int16Array(count);
          for(let k=0;k<count;k++){const p=k*this.rate/16000;const a=Math.floor(p);const w=p-a;const sample=(src[a]||0)*(1-w)+(src[Math.min(a+1,src.length-1)]||0)*w;
            const v=Math.max(-1,Math.min(1,sample));pcm[k]=v<0?v*32768:v*32767;}
          this.port.postMessage(pcm.buffer,[pcm.buffer]);}
        return true;}
    }registerProcessor('pcm16-live-worklet',Pcm16Worklet);`;
    this.url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
    try {
      await this.ctx.audioWorklet.addModule(this.url);
      this.source=this.ctx.createMediaStreamSource(this.stream);
      this.processor=new AudioWorkletNode(this.ctx,'pcm16-live-worklet');
      this.processor.port.onmessage=({data})=>this.onAudio(uint8ToBase64(new Uint8Array(data)));
      this.silent=this.ctx.createGain();this.silent.gain.value=0;
      this.source.connect(this.processor).connect(this.silent).connect(this.ctx.destination);
    } catch(error) {await this.stop();throw error;}
  }
  async stop() {
    this.source?.disconnect();this.processor?.disconnect();this.silent?.disconnect();
    this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;
    if(this.ctx)await this.ctx.close().catch(()=>{});this.ctx=null;
    if(this.url)URL.revokeObjectURL(this.url);this.url=null;
    this.source=null;this.processor=null;this.silent=null;
  }
}