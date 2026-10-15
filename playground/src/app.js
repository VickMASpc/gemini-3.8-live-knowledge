import {LiveController,DEFAULT_FUNCTIONS} from './live.js';

const $=s=>document.querySelector(s);
const icons={
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 'sliders-horizontal':'<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 code:'<path d="m8 4-6 8 6 8m8-16 6 8-6 8"/>',
 'key-round':'<circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 8-8L22 6l-3 3 2 2-3 3-2-2-2 2"/>',
 'chevron-down':'<path d="m6 9 6 6 6-6"/>','chevron-up':'<path d="m6 15 6-6 6 6"/>',
 'audio-lines':'<path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10v4"/>',
 'plus-circle':'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 'eye-off':'<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.4A10.3 10.3 0 0 1 12 5c5 0 9 7 9 7a17.7 17.7 0 0 1-3.5 4.1M6.2 6.2C3.6 8 3 12 3 12s4 7 9 7c1.1 0 2.1-.2 3-.6"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
 blocks:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8m-4-4v8"/>',
 mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>',
 'mic-off':'<path d="m2 2 20 20M9 9v2a3 3 0 0 0 5 2M15 9V5a3 3 0 0 0-6 0v.3M5 10a7 7 0 0 0 12 4M12 17v5m-4 0h8"/>',
 video:'<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
 'video-off':'<path d="m2 2 20 20M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11v-5M16 10l5-3v10l-2-1"/>',
 'camera':'<path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3"/>',
 monitor:'<rect x="3" y="3" width="18" height="14" rx="1"/><path d="M8 21h8m-4-4v4"/>',
 'play-circle':'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
 'book-open':'<path d="M12 7c-3-3-7-3-10-2v14c4-1 8 0 10 2m0-14c3-3 7-3 10-2v14c-4-1-8 0-10 2m0-14v14"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'
};
const icon=(name)=>`<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.info}</svg>`;
function decorate(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
decorate();

const MODELS={
 'gemini-3.8-live':{title:'Gemini 3.8 Live',description:'Our low-latency, real-time dialogue model optimized for fluid, uninterrupted conversations with seamless, background async function calling.'},
 'gemini-3.8-live-extended-thinking':{title:'Gemini 3.8 Live Extended Thinking',description:'Our high-precision audio model engineered for complex tasks, capable of in-depth reasoning while speaking with natural verbal cues.'}
};
const VOICES=[
 ['Zephyr','Bright, Higher pitch'],['Puck','Upbeat, Middle pitch'],['Charon','Informative, Lower pitch'],['Kore','Firm, Middle pitch'],['Fenrir','Excitable, Lower middle pitch'],
 ['Leda','Youthful, Higher pitch'],['Orus','Firm, Lower middle pitch'],['Aoede','Breezy, Middle pitch'],['Callirrhoe','Easy-going, Middle pitch'],['Autonoe','Bright, Middle pitch'],
 ['Enceladus','Breathy, Lower pitch'],['Iapetus','Clear, Lower middle pitch'],['Umbriel','Easy-going, Lower middle pitch'],['Algieba','Smooth, Lower pitch'],['Despina','Smooth, Middle pitch'],
 ['Erinome','Clear'],['Algenib','Gravelly'],['Rasalgethi','Informative'],['Laomedeia','Upbeat, Higher pitch'],['Achernar','Soft, Higher pitch'],
 ['Alnilam','Firm, Lower middle pitch'],['Schedar','Even, Lower middle pitch'],['Gacrux','Mature, Middle pitch'],['Pulcherrima','Forward'],['Achird','Friendly'],
 ['Zubenelgenubi','Casual'],['Vindemiatrix','Gentle'],['Sadachbia','Lively'],['Sadaltager','Knowledgeable'],['Sulafat','Warm']
];
const RESOLUTIONS={Low:'Low (64 tokens / image)',Medium:'Medium (258 tokens / image)',High:'High (1032 tokens / image)'};
const state={model:'gemini-3.8-live-extended-thinking',voice:'Zephyr',resolution:'Medium',thinking:'Low',systemInstruction:'',maxContext:104857,targetContext:52428,
 functionsEnabled:false,autoFunctionResponse:false,searchEnabled:false,functions:structuredClone(DEFAULT_FUNCTIONS),key:'',welcome:true,mediaHidden:false,
 userDraft:null,modelDraft:null,currentModelElement:null,userElement:null,audioUrls:[]};
let modalResolve=null;
let toastTimer;
function toast(message){const e=$('#toast');e.textContent=message;e.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{e.hidden=true},4200);}
function snapshot(){return{model:state.model,voice:state.voice,resolution:state.resolution,thinking:state.thinking,systemInstruction:state.systemInstruction,maxContext:state.maxContext,targetContext:state.targetContext,
 functionsEnabled:state.functionsEnabled,autoFunctionResponse:state.autoFunctionResponse,searchEnabled:state.searchEnabled,functions:structuredClone(state.functions)};}
const live=new LiveController({
 status:(text,type)=>{
   $('#session-status').hidden=type==='offline';
   $('#status-text').textContent=text;
   $('#run-button').classList.toggle('live',type==='live');
   $('#close-stream').hidden=type==='connecting'||type==='offline';
   if(type==='live')$('#run-button').textContent='Run';
 },
 error:message=>toast(message),
 transcript:(role,text)=>appendTranscription(role,text),
 audio:blob=>{
   const url=URL.createObjectURL(blob);state.audioUrls.push(url);
   const row=getMessageRow('Model');
   const player=document.createElement('audio');player.controls=true;player.src=url;
   row.querySelector('.message-body').prepend(player);
   scrollConversation();
 },
 tool:detail=>{const row=getMessageRow('Model'),el=document.createElement('div');el.className='tool-event';el.textContent='Function call: '+detail;row.querySelector('.message-body').append(el);scrollConversation();},
 askFunction:askFunctionResponse,
 interrupted:()=>{state.modelDraft=null;state.currentModelElement=null;},
 turnDone:()=>{state.modelDraft=null;state.currentModelElement=null;state.userDraft=null;state.userElement=null;},
 media:mode=>{
   $('#media-preview').hidden=!mode||state.mediaHidden;
   $('#media-label').textContent=mode==='screen'?'Screen sharing':`Camera · ${mode}`;
   $('#camera-button').classList.toggle('active',!!mode);
 }
});
function resetDrafts(){state.userDraft=null;state.modelDraft=null;state.currentModelElement=null;state.userElement=null;}
function showConversation(){if(!state.welcome)return;state.welcome=false;$('#welcome').hidden=true;}
function scrollConversation(){requestAnimationFrame(()=>{$('#conversation').scrollTop=$('#conversation').scrollHeight;});}
function addMessage(role,text=''){
 showConversation();
 const outer=document.createElement('section');outer.className='message';
 const label=document.createElement('div');label.className='message-label';label.textContent=role;
 const body=document.createElement('div');body.className='message-body';
 const content=document.createElement('div');content.className='message-text';content.textContent=text;
 body.append(content);outer.append(label,body);$('#messages').append(outer);
 if(role==='Model'&&!outer.querySelector('.message-note')){
   const note=document.createElement('div');note.className='message-note';note.innerHTML=`${icon('info')} &nbsp;Google AI models may make mistakes, so double-check outputs.`;
   outer.append(note);
 }
 scrollConversation();return outer;
}
function getMessageRow(role){
 const key=role==='Model'?'currentModelElement':'userElement';
 if(!state[key])state[key]=addMessage(role);
 return state[key];
}
function appendTranscription(role,text){
 const row=getMessageRow(role);
 const el=row.querySelector('.message-text');
 const draftKey=role==='Model'?'modelDraft':'userDraft';
 const before=state[draftKey]||'';
 // SDK emits either incremental fragments or accumulated partial transcriptions.
 const newText=text.startsWith(before)?text:before+text;
 state[draftKey]=newText;el.textContent=newText;
 scrollConversation();
}
function setModel(model){
 if(!MODELS[model])return;
 state.model=model;$('#model-title').textContent=MODELS[model].title;
 $('#model-code').textContent=model;$('#model-description').textContent=MODELS[model].description;
 $('#welcome h1').innerHTML=model==='gemini-3.8-live'? 'Talk with Gemini 3.8<br><span>Live</span>' :'Talk with Gemini 3.8<br><span>Live Extended Thinking</span>';
 $('#thinking-section').hidden=model==='gemini-3.8-live';
 $('#model-list').hidden=true;
 if(live.active)toast('Model changes will apply to the next session.');
}
function closeFloating(){document.querySelectorAll('.floating-menu,.model-options').forEach(el=>el.hidden=true);}
function toggleFloating(element){const was=element.hidden;closeFloating();element.hidden=!was;}
function setupDropdowns(){
 const vm=$('#voice-menu');
 for(const [name,desc]of VOICES){
   const b=document.createElement('button');b.className='voice-choice'+(state.voice===name?' selected':'');
   b.type='button';b.innerHTML=`${icon('play-circle')}<span><b></b><small></small></span>`;
   b.querySelector('b').textContent=name;b.querySelector('small').textContent=desc;
   b.addEventListener('click',()=>{state.voice=name;$('#voice-value').textContent=name;vm.hidden=true;vm.querySelectorAll('.voice-choice').forEach(x=>x.classList.toggle('selected',x===b));if(live.active)toast('Voice changes apply to the next session.');});
   vm.append(b);
 }
 const rm=$('#resolution-menu');
 Object.entries(RESOLUTIONS).forEach(([name,description])=>{
   const b=document.createElement('button');b.type='button';b.className='option-choice';b.textContent=description;
   b.addEventListener('click',()=>{state.resolution=name;$('#resolution-value').textContent=description;rm.hidden=true;});rm.append(b);
 });
 for(const name of ['Low','Medium','High']){
   const b=document.createElement('button');b.type='button';b.className='option-choice';b.textContent=name;
   b.addEventListener('click',()=>{state.thinking=name;$('#thinking-value').textContent=name;$('#thinking-menu').hidden=true;});$('#thinking-menu').append(b);
 }
 for(const id of ['voice','resolution','thinking'])$('#'+id+'-button').addEventListener('click',ev=>{ev.stopPropagation();toggleFloating($('#'+id+'-menu'));});
 $('#model-switcher .model-card').addEventListener('click',ev=>{ev.stopPropagation();toggleFloating($('#model-list'));});
 $('#model-list').querySelectorAll('[data-model]').forEach(el=>el.addEventListener('click',()=>setModel(el.dataset.model)));
 document.addEventListener('pointerdown',event=>{
   if(!event.target.closest('.select-anchor,.model-switcher,.camera-anchor'))closeFloating();
 });
}
setupDropdowns();
function drawerOpen(open){$('#settings-panel').classList.toggle('open',open);$('#settings-panel').setAttribute('aria-hidden',String(!open));$('#scrim').hidden=!open;if(open)$('#side-nav').classList.remove('open');closeFloating();}
function navOpen(open){$('#side-nav').classList.toggle('open',open);$('#side-nav').setAttribute('aria-hidden',String(!open));$('#scrim').hidden=!open;if(open)$('#settings-panel').classList.remove('open');}
$('#settings-button').addEventListener('click',()=>drawerOpen(true));
$('#settings-close').addEventListener('click',()=>drawerOpen(false));
$('#menu-button').addEventListener('click',()=>navOpen(true));
$('#nav-close').addEventListener('click',()=>navOpen(false));
$('#scrim').addEventListener('click',()=>{drawerOpen(false);navOpen(false)});
$('#nav-settings').addEventListener('click',()=>{navOpen(false);drawerOpen(true)});
$('#nav-key').addEventListener('click',()=>{navOpen(false);showKeyModal()});
$('#auth-shortcut').addEventListener('click',showKeyModal);
$('#nav-new').addEventListener('click',async()=>{navOpen(false);await live.stop();$('#messages').replaceChildren();resetDrafts();$('#welcome').hidden=false;state.welcome=true;});
function collapse(button,body){const hidden=!body.hidden;body.hidden=hidden;button.querySelector('svg').outerHTML=icon(hidden?'chevron-down':'chevron-up');}
$('#context-collapse').addEventListener('click',()=>collapse($('#context-collapse'),$('#context-content')));
$('#tools-collapse').addEventListener('click',()=>collapse($('#tools-collapse'),$('#tools-content')));
$('#system-instructions').addEventListener('input',event=>state.systemInstruction=event.target.value);
for(const [name,id] of [['maxContext','max-context'],['targetContext','target-context']]){
 const input=$('#'+id),output=$('#'+id+'-value');
 function update(){state[name]=Number(input.value);output.textContent=input.value;
   input.style.setProperty('--progress',`${100*(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))}%`);
   if(state.targetContext>=state.maxContext){state.targetContext=state.maxContext-1;$('#target-context').value=state.targetContext;$('#target-context-value').textContent=String(state.targetContext);}
 }
 input.addEventListener('input',update);update();
}
for(const [name,id] of [['functionsEnabled','function-toggle'],['autoFunctionResponse','auto-function-toggle'],['searchEnabled','search-toggle']]){
 $('#'+id).addEventListener('change',event=>{state[name]=event.target.checked;if(live.active)toast('Tool changes apply to the next session.');});
}
$('#tools-button').addEventListener('click',()=>drawerOpen(true));

// Dialogs intentionally keep secret tokens out of source code, Git history, and localStorage.
function openModal(title){$('#modal-title').textContent=title;$('#modal-content').replaceChildren();$('#modal-backdrop').hidden=false;}
function closeModal(value=null){$('#modal-backdrop').hidden=true;$('#modal-content').replaceChildren();if(modalResolve){modalResolve(value);modalResolve=null;}}
$('#modal-close').addEventListener('click',()=>closeModal());
$('#modal-backdrop').addEventListener('click',event=>{if(event.target===$('#modal-backdrop'))closeModal();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal();drawerOpen(false);navOpen(false);closeFloating();}});
function modalElement(tag,content,classes=''){
 const el=document.createElement(tag);if(classes)el.className=classes;if(content)el.textContent=content;$('#modal-content').append(el);return el;
}
function modalActions(negative,positive,onPositive){
 const row=modalElement('div',null,'modal-actions');
 const cancel=document.createElement('button');cancel.textContent=negative;cancel.addEventListener('click',()=>closeModal());
 const save=document.createElement('button');save.className='primary';save.textContent=positive;save.addEventListener('click',onPositive);
 row.append(cancel,save);return save;
}
function showKeyModal(){
 openModal('Connect to Gemini Live');
 modalElement('p','Paste your personal Gemini API key or short-lived Live API token. It remains only in the memory of this browser tab and is never included in the GitHub Pages build.');
 const field=modalElement('input');field.type='password';field.placeholder='Gemini API key / ephemeral token';field.autocomplete='off';field.spellcheck=false;field.value=state.key;
 modalElement('p','Browser API-key mode is for personal testing. For a publicly used site, obtain short-lived ephemeral tokens from a trusted backend. Never place a permanent key in Vite environment variables or GitHub Pages code.');
 modalActions('Cancel','Use key',()=>{const value=field.value.trim();if(!value){toast('Enter a key or ephemeral token.');return;}state.key=value;closeModal(true);toast('Key held in this tab only.');});
 field.focus();
}
function getKey(){
 if(state.key)return Promise.resolve(true);
 return new Promise(resolve=>{
   openModal('API key required');
   modalElement('p','GitHub Pages cannot hide a permanent Gemini API key. Supply your own key for a personal session, or a short-lived token minted by your backend.');
   const field=modalElement('input');field.type='password';field.placeholder='Paste API key or ephemeral token';field.autocomplete='off';
   modalActions('Cancel','Connect',()=>{if(!field.value.trim())return toast('Enter a key first.');state.key=field.value.trim();closeModal(true);});
   modalResolve=resolve;field.focus();
 });
}
$('#edit-functions').addEventListener('click',()=>{
 openModal('Function declarations');
 modalElement('p','Edit the Live API functionDeclarations JSON. Only built-in get_current_time and get_page_title have automatic browser implementations; other functions require manual responses (or return a clear error when auto-response is enabled).');
 const area=modalElement('textarea');area.value=JSON.stringify(state.functions,null,2);area.spellcheck=false;
 modalActions('Cancel','Apply',()=>{
   try{
     const arr=JSON.parse(area.value);
     if(!Array.isArray(arr)||arr.some(x=>typeof x.name!=='string'||!x.name))throw Error('Expected an array of named function declarations.');
     state.functions=arr;$('#function-toggle').checked=state.functionsEnabled=true;closeModal();toast(`${arr.length} function declarations configured. Restart the session to apply.`);
   }catch(error){toast(error.message);}
 });
});
async function askFunctionResponse(call){
 return new Promise(resolve=>{
   openModal('Function response: '+call.name);
   modalElement('p','Gemini requested a browser-side function. Review the arguments and supply a JSON response. No arbitrary JavaScript executes automatically.');
   const input=modalElement('textarea');input.value=JSON.stringify({result:'ok',arguments:call.args||{}},null,2);
   modalActions('Return error','Send response',()=>{
     try{const response=JSON.parse(input.value);modalResolve=null;closeModal();resolve(response);}catch(e){toast('Response must be valid JSON.');}
   });
   // If user closes the modal, resolve instead of hanging a non-blocking tool call.
   modalResolve=(value)=>resolve(value||{error:'User closed function response dialog'});
 });
}
$('#get-code').addEventListener('click',()=>{
 const config=live.configFor(snapshot());
 const safeCode=`import { GoogleGenAI } from '@google/genai';\n\n// Supply a short-lived token from your server (or a personal test key).\nconst ai = new GoogleGenAI({ apiKey: YOUR_TOKEN });\nconst session = await ai.live.connect({\n  model: '${state.model}',\n  config: ${JSON.stringify(config,null,2)},\n  callbacks: {\n    onopen: () => console.log('Connected'),\n    onmessage: message => console.log(message),\n    onerror: error => console.error(error),\n    onclose: () => console.log('Closed')\n  }\n});`;
 openModal('Get code');
 modalElement('p','Live connection configuration for your selected settings. This excludes credentials, microphone capture, and audio playback code.');
 const area=modalElement('textarea');area.value=safeCode;area.readOnly=true;
 modalActions('Close','Copy code',async()=>{await navigator.clipboard.writeText(safeCode);toast('Configuration copied');closeModal();});
});
async function ensureConnected(){
 if(live.session)return true;
 if(live.connecting)return false;
 if(!await getKey())return false;
 try{await live.connect(snapshot(),state.key);return true;}catch{return false;}
}
$('#composer').addEventListener('submit',async event=>{
 event.preventDefault();
 const text=$('#prompt').value.trim();
 if(!await ensureConnected())return;
 if(text){
   state.userDraft=null;state.userElement=null;addMessage('User',text);
   $('#prompt').value='';
   try{live.sendText(text);}catch(error){toast(error.message);}
 }else toast('Stream is live. Enable your microphone, or type a message.');
});
$('#prompt').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();$('#composer').requestSubmit();}});
$('#mic-button').addEventListener('click',async()=>{
 if(live.mic){await live.disableMic();$('#mic-button').classList.remove('active');$('#mic-button').innerHTML=icon('mic');return;}
 if(!await ensureConnected())return;
 try{await live.enableMic();$('#mic-button').classList.add('active');$('#mic-button').innerHTML=icon('mic-off');}catch(e){toast('Microphone: '+e.message);}
});
const menu=$('#camera-menu');
const choices=[['user','camera','camera 1, facing front (user)'],['environment','camera','camera 0, facing back (environment)'],['screen','monitor','Share screen / window'],['off','video-off','Turn off camera']];
choices.forEach(([mode,name,label])=>{const btn=document.createElement('button');btn.type='button';btn.innerHTML=icon(name)+'<span></span>';btn.querySelector('span').textContent=label;btn.addEventListener('click',async()=>{
 menu.hidden=true;
 if(mode==='off'){await live.disableVideo();return;}
 if(!await ensureConnected())return;
 try{await live.enableVideo(mode);}catch(error){toast(`Unable to share ${mode==='screen'?'screen':'camera'}: ${error.message}`);}
 });menu.append(btn);});
$('#camera-button').addEventListener('click',event=>{event.stopPropagation();toggleFloating(menu);});
$('#stop-media').addEventListener('click',()=>live.disableVideo());
$('#visibility-button').addEventListener('click',()=>{
 state.mediaHidden=!state.mediaHidden;
 $('#media-preview').hidden=!live.mediaStream||state.mediaHidden;
 $('#visibility-button').innerHTML=icon(state.mediaHidden?'eye':'eye-off');
});
$('#close-stream').addEventListener('click',async()=>{await live.stop();$('#mic-button').classList.remove('active');$('#mic-button').innerHTML=icon('mic');resetDrafts();});
$('#add-button').addEventListener('click',()=>$('#image-input').click());
$('#image-input').addEventListener('change',async(event)=>{
 const file=event.target.files?.[0];if(!file)return;
 if(!await ensureConnected())return;
 try{await live.sendImage(file);addMessage('User','[Image shared: '+file.name+']');toast('Image sent to the live session.');}catch(error){toast('Image: '+error.message);}
 event.target.value='';
});
// Suggested prompts pre-fill, keeping interaction identical to the original landing screen.
document.querySelectorAll('[data-suggest]').forEach(button=>button.addEventListener('click',()=>{$('#prompt').value=button.dataset.suggest;$('#prompt').focus();}));
window.addEventListener('pagehide',()=>{void live.stop();state.audioUrls.forEach(url=>URL.revokeObjectURL(url));});
setModel(state.model);