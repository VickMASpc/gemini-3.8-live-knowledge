import {AudioPlayer, MicrophoneStream, rawPcmToWav, base64ToBytes} from './audio.js';

// Tools with truthful local implementations. Arbitrary supplied functions are NEVER eval()'d.
export const DEFAULT_FUNCTIONS = [
  {name:'get_current_time',description:'Return the actual current time, date, and timezone from the client device',behavior:'NON_BLOCKING',parameters:{type:'OBJECT',properties:{},required:[]}},
  {name:'get_page_title',description:'Get the title and URL of the current browser page',behavior:'NON_BLOCKING',parameters:{type:'OBJECT',properties:{},required:[]}}
];
const localFunctionHandlers = {
  get_current_time: () => ({iso:new Date().toISOString(),local:new Date().toString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}),
  get_page_title: () => ({title:document.title,url:location.href})
};
export class LiveController {
  constructor(events) {
    this.events=events;this.session=null;this.active=false;this.connecting=false;this.rejoining=false;
    this.key='';this.model='';this.settings=null;this.resumptionHandle=null;
    this.player=new AudioPlayer();this.mic=null;this.mediaStream=null;this.frameTimer=null;
    this.audioChunks=[];this.mediaUrl=null;this.connectSerial=0;this.idle=true;
  }
  configFor(settings, handle) {
    const config = {
      responseModalities:['AUDIO'],
      speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:settings.voice}}},
      inputAudioTranscription:{},outputAudioTranscription:{},
      mediaResolution: `MEDIA_RESOLUTION_${settings.resolution.toUpperCase()}`,
      contextWindowCompression:{triggerTokens:String(settings.maxContext),slidingWindow:{targetTokens:String(settings.targetContext)}},
      sessionResumption:handle ? {handle} : {},
    };
    if (settings.systemInstruction.trim()) config.systemInstruction={parts:[{text:settings.systemInstruction.trim()}]};
    if(settings.model==='gemini-3.8-live-extended-thinking')config.thinkingConfig={thinkingLevel:settings.thinking.toLowerCase()};
    const tools=[];
    if(settings.functionsEnabled && settings.functions.length){
      tools.push({functionDeclarations:settings.functions.map(f=>({
        name:f.name,description:f.description,parameters:f.parameters,
        // The extended model explicitly forbids blocking/scheduling behavior.
        behavior:settings.model.endsWith('extended-thinking')?'NON_BLOCKING':(f.behavior||'NON_BLOCKING')
      }))});
    }
    if(settings.searchEnabled)tools.push({googleSearch:{}});
    if(tools.length)config.tools=tools;
    return config;
  }
  async connect(settings, key, handle=null) {
    if(this.connecting)return;
    this.connecting=true;this.active=true;this.model=settings.model;this.settings=settings;this.key=key;
    this.events.status('Connecting to server...','connecting');
    const serial=++this.connectSerial;
    try {
      await this.player.prepare();
      const {GoogleGenAI}=await import('@google/genai');
      const ai=new GoogleGenAI({apiKey:key,httpOptions:{apiVersion:'v1beta'}});
      const connection=await ai.live.connect({
        model:settings.model,
        config:this.configFor(settings,handle),
        callbacks:{
          onopen:()=>{},
          onmessage:(message)=>{if(serial===this.connectSerial)this.onMessage(message);},
          onerror:(event)=>{if(serial===this.connectSerial)this.events.error(`Live API error: ${event?.message||'WebSocket error'}`);},
          onclose:(event)=>{if(serial===this.connectSerial)this.onClosed(event);}
        }
      });
      if(serial!==this.connectSerial){connection.close();return;}
      this.session=connection;this.connecting=false;this.rejoining=false;
      this.events.status('Stream is live','live');
    }catch(error){
      this.connecting=false;this.active=false;this.rejoining=false;
      this.events.error(error?.message||'Could not connect to Gemini Live.');
      this.events.status('Connection failed','error');
      throw error;
    }
  }
  onMessage(message) {
    const content=message.serverContent;
    if(message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate.newHandle)this.resumptionHandle=message.sessionResumptionUpdate.newHandle;
    if(message.goAway)this.events.status('Reconnecting soon...','connecting');
    if(message.toolCall?.functionCalls?.length)void this.handleToolCalls(message.toolCall.functionCalls);
    if(message.toolCallCancellation?.ids)this.events.tool('Tool call cancelled: '+message.toolCallCancellation.ids.join(', '));
    if(!content)return;
    if(content.interrupted){this.player.interrupt();this.finishAudio();this.events.interrupted();}
    if(content.inputTranscription?.text)this.events.transcript('User',content.inputTranscription.text);
    if(content.outputTranscription?.text)this.events.transcript('Model',content.outputTranscription.text);
    if(content.modelTurn?.parts){
      for(const part of content.modelTurn.parts){
        if(part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')){
          this.player.play(part.inlineData.data);
          this.audioChunks.push(base64ToBytes(part.inlineData.data));
        }
        if(part.text && !part.thought)this.events.transcript('Model',part.text);
      }
    }
    if(content.generationComplete || (content.turnComplete && this.model==='gemini-3.8-live'))this.finishAudio();
    // Extended Thinking can emit more audio/tools AFTER turnComplete. Wait for IDLE.
    const status=String(content.interactionStatus||content.interaction_status||message.interactionStatus||message.interaction_status||'').toUpperCase();
    if(status==='IDLE'){this.idle=true;this.finishAudio();this.events.turnDone();}
    else if(status==='IN_PROGRESS')this.idle=false;
    if(content.turnComplete&&this.model==='gemini-3.8-live')this.events.turnDone();
  }
  finishAudio(){
    if(!this.audioChunks.length)return;
    const blob=rawPcmToWav(this.audioChunks);this.audioChunks=[];
    this.events.audio(blob);
  }
  async handleToolCalls(functionCalls){
    const responses=[];
    for(const call of functionCalls){
      this.events.tool(`${call.name}(${JSON.stringify(call.args||{})})`);
      let result;
      if(this.settings.autoFunctionResponse){
        const implementation=localFunctionHandlers[call.name];
        result=implementation?implementation(call.args||{}):{error:`No local implementation for ${call.name}. Define a response manually or supply a server executor.`};
      }else{
        result=await this.events.askFunction(call);
      }
      responses.push({id:call.id,name:call.name,response:result||{error:'Cancelled by user'}});
    }
    if(this.session&&responses.length)this.session.sendToolResponse({functionResponses:responses});
  }
  sendText(text){
    if(!this.session)throw Error('Connect first.');
    this.session.sendClientContent({turns:[{role:'user',parts:[{text}]}],turnComplete:true});
  }
  sendImage(file){
    if(!this.session)throw Error('Connect first.');
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{
        const base64=String(reader.result).split(',')[1];
        this.session.sendRealtimeInput({video:{data:base64,mimeType:file.type||'image/jpeg'}});
        resolve();
      };
      reader.onerror=reject;reader.readAsDataURL(file);
    });
  }
  async enableMic(){
    if(!this.session)throw Error('Connect first.');
    if(this.mic)return;
    const mic=new MicrophoneStream(base64=>{
      if(this.session)this.session.sendRealtimeInput({audio:{data:base64,mimeType:'audio/pcm;rate=16000'}});
    });
    await mic.start();this.mic=mic;
  }
  async disableMic(){if(!this.mic)return;await this.mic.stop();this.mic=null;this.session?.sendRealtimeInput({audioStreamEnd:true});}
  async enableVideo(mode='user'){
    if(!this.session)throw Error('Connect first.');
    await this.disableVideo();
    const screen=mode==='screen';
    const stream=screen?await navigator.mediaDevices.getDisplayMedia({video:true,audio:false}):await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:mode},width:{ideal:960}},audio:false});
    this.mediaStream=stream;
    stream.getVideoTracks()[0]?.addEventListener('ended',()=>this.disableVideo());
    const video=document.getElementById('preview-video');video.srcObject=stream;await video.play();
    const canvas=document.createElement('canvas');
    const sendFrame=()=>{
      if(!this.session||!this.mediaStream||!video.videoWidth)return;
      const w=Math.min(640,video.videoWidth),h=Math.round(video.videoHeight*w/video.videoWidth);
      canvas.width=w;canvas.height=h;canvas.getContext('2d',{alpha:false}).drawImage(video,0,0,w,h);
      const base64=canvas.toDataURL('image/jpeg',.70).split(',')[1];
      this.session.sendRealtimeInput({video:{data:base64,mimeType:'image/jpeg'}});
    };
    sendFrame();this.frameTimer=setInterval(sendFrame,1000);this.events.media(mode);
  }
  async disableVideo(){
    clearInterval(this.frameTimer);this.frameTimer=null;
    this.mediaStream?.getTracks().forEach(t=>t.stop());this.mediaStream=null;
    const video=document.getElementById('preview-video');video.pause();video.srcObject=null;
    this.events.media(null);
  }
  onClosed(event){
    this.session=null;
    if(!this.active)return;
    this.events.status('Connecting to server...','connecting');
    // Try to resume only if server supplied a valid resumable handle.
    if(this.resumptionHandle&&!this.rejoining){
      this.rejoining=true;
      void this.connect(this.settings,this.key,this.resumptionHandle).catch(()=>this.stop());
    }else{
      this.active=false;
      this.events.error(`Connection closed${event?.reason?': '+event.reason:''}. Start a new session.`);
      this.events.status('Disconnected','error');
      void this.disableMic();void this.disableVideo();
    }
  }
  async stop(){
    this.active=false;this.rejoining=false;this.connectSerial++;this.connecting=false;
    const s=this.session;this.session=null;this.resumptionHandle=null;
    try{s?.close();}catch{}
    await Promise.all([this.disableMic(),this.disableVideo(),this.player.dispose()]);
    this.audioChunks=[];this.events.status('', 'offline');
  }
}