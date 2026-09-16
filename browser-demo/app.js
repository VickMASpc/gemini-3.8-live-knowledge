const SDK_URL = 'https://esm.sh/@google/genai@2.22.0?bundle';
const STORAGE = { preferences: 'gemini-live-workspace.preferences', notes: 'gemini-live-workspace.notes', apiKey: 'gemini-live-workspace.api-key' };
const ids = 'connectionState connectionLabel voiceVisual stageTitle stageDescription startButton muteButton endButton apiKeyInput showKeyButton rememberKeyToggle profileNameInput profileContextInput responseStyleSelect savePreferencesButton modelInput voiceSelect inputTranscriptToggle outputTranscriptToggle vadToggle instructionForm instructionInput sendInstructionButton transcriptList transcriptTemplate eventList clearTranscriptButton clearEventsButton noteForm noteTitleInput noteBodyInput notesList noteTemplate clearNotesButton modeSummary'.split(' ');
const elements = Object.fromEntries(ids.map((id) => [id, document.querySelector(`#${id}`)]));
elements.muteLabel = elements.muteButton.querySelector('span');

const state = { phase: 'disconnected', muted: false, session: null, sdk: null, inputContext: null, outputContext: null, stream: null, worklet: null, scheduledSources: new Set(), nextPlaybackTime: 0, inFlightTools: new Map(), latestResumeHandle: null, notes: [], preferences: {}, apiKey: '' };
const now = () => new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
function safeParse(value, fallback) { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } }
function setConnection(phase, label) { state.phase = phase; elements.connectionState.dataset.state = phase; elements.connectionLabel.textContent = label; }
function setStage(visual, title, description) { elements.voiceVisual.dataset.state = visual; elements.stageTitle.textContent = title; elements.stageDescription.textContent = description; }
function addEvent(kind, message) { const item = document.createElement('li'); const time = document.createElement('time'); const code = document.createElement('code'); const text = document.createElement('span'); time.dateTime = new Date().toISOString(); time.textContent = now(); code.textContent = `[${kind}]`; code.className = `event-${kind.split('.')[0]}`; text.textContent = message; item.append(time, code, text); elements.eventList.append(item); elements.eventList.scrollTop = elements.eventList.scrollHeight; }
function addTranscript(speaker, text) { elements.transcriptList.querySelector('.empty-state')?.remove(); const item = elements.transcriptTemplate.content.firstElementChild.cloneNode(true); item.classList.toggle('model', speaker === 'Gemini'); item.querySelector('strong').textContent = speaker; item.querySelector('p').textContent = text; item.querySelector('time').textContent = now(); elements.transcriptList.append(item); elements.transcriptList.scrollTop = elements.transcriptList.scrollHeight; }

function updateSessionControls(active) {
  elements.startButton.disabled = active; elements.muteButton.disabled = !active; elements.endButton.disabled = !active; elements.instructionInput.disabled = !active; elements.sendInstructionButton.disabled = !active;
  [elements.modelInput, elements.voiceSelect, elements.inputTranscriptToggle, elements.outputTranscriptToggle, elements.vadToggle].forEach((control) => { control.disabled = active; });
}
function persistNotes() { localStorage.setItem(STORAGE.notes, JSON.stringify(state.notes)); renderNotes(); }
function renderNotes() {
  elements.notesList.replaceChildren();
  if (!state.notes.length) { const empty = document.createElement('li'); empty.className = 'empty-state'; empty.textContent = 'No notes yet.'; elements.notesList.append(empty); return; }
  for (const note of state.notes) {
    const item = elements.noteTemplate.content.firstElementChild.cloneNode(true);
    item.querySelector('strong').textContent = note.title; item.querySelector('p').textContent = note.body;
    item.querySelector('time').textContent = new Intl.DateTimeFormat([], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.updatedAt));
    item.querySelector('button').addEventListener('click', () => { state.notes = state.notes.filter((candidate) => candidate.id !== note.id); persistNotes(); addEvent('tool', 'Note deleted'); });
    elements.notesList.append(item);
  }
}
function saveNote({ title, body }) {
  const cleanTitle = String(title ?? '').trim().slice(0, 120); const cleanBody = String(body ?? '').trim().slice(0, 1800);
  if (!cleanTitle && !cleanBody) throw new Error('Add a note title or body.');
  const note = { id: crypto.randomUUID(), title: cleanTitle || 'Untitled note', body: cleanBody, updatedAt: new Date().toISOString() };
  state.notes.unshift(note); persistNotes(); addEvent('tool', `Saved note: ${note.title}`); return { saved: true, note: { title: note.title, body: note.body } };
}
function collectPreferences() { return { name: elements.profileNameInput.value.trim().slice(0, 80), context: elements.profileContextInput.value.trim().slice(0, 900), style: elements.responseStyleSelect.value }; }
function applyPreferences(preferences) { state.preferences = { name: String(preferences.name ?? '').slice(0, 80), context: String(preferences.context ?? '').slice(0, 900), style: ['concise', 'balanced', 'detailed'].includes(preferences.style) ? preferences.style : 'concise' }; elements.profileNameInput.value = state.preferences.name; elements.profileContextInput.value = state.preferences.context; elements.responseStyleSelect.value = state.preferences.style; }
function savePreferences(preferences = collectPreferences()) { applyPreferences(preferences); localStorage.setItem(STORAGE.preferences, JSON.stringify(state.preferences)); addEvent('tool', 'Personalization saved locally'); return { saved: true, personalization: state.preferences }; }
function buildSystemInstruction() { const { name, context, style } = state.preferences; return `You are a practical, warm voice assistant inside a browser-only personal workspace. ${name ? `The user's name is ${name}.` : ''} ${context ? `Useful user context: ${context}` : ''} Give ${style || 'concise'} answers. You have local browser tools: save_note for remembering a user-requested note, list_notes to retrieve notes, update_personalization when the user asks you to change how you address or help them, and get_local_time for time questions. Use tools only when requested or clearly useful. Never claim a note or preference was saved until its tool response confirms it. Keep all notes and personalization local to this browser.`; }

function arrayBufferToBase64(buffer) { const bytes = new Uint8Array(buffer); let binary = ''; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary); }
function base64ToInt16(base64) { const binary = atob(base64); const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0)); return new Int16Array(bytes.buffer); }
async function ensureOutputContext() { if (!state.outputContext || state.outputContext.state === 'closed') { state.outputContext = new AudioContext({ latencyHint: 'interactive' }); state.nextPlaybackTime = 0; } if (state.outputContext.state === 'suspended') await state.outputContext.resume(); return state.outputContext; }
async function enqueueOutputAudio(base64Pcm) { const context = await ensureOutputContext(); const samples = base64ToInt16(base64Pcm); const audioBuffer = context.createBuffer(1, samples.length, 24000); const channel = audioBuffer.getChannelData(0); for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 32768; const source = context.createBufferSource(); source.buffer = audioBuffer; source.connect(context.destination); const startsAt = Math.max(context.currentTime + 0.02, state.nextPlaybackTime); state.nextPlaybackTime = startsAt + audioBuffer.duration; state.scheduledSources.add(source); source.addEventListener('ended', () => state.scheduledSources.delete(source), { once: true }); source.start(startsAt); setStage('speaking', 'Gemini is speaking', 'Speak at any time to interrupt.'); }
function clearPlayback() { for (const source of state.scheduledSources) { try { source.stop(); } catch { /* already ended */ } } state.scheduledSources.clear(); state.nextPlaybackTime = 0; }
async function startMicrophone() {
  state.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
  state.inputContext = new AudioContext({ latencyHint: 'interactive' }); await state.inputContext.audioWorklet.addModule('./pcm-worklet.js');
  const source = state.inputContext.createMediaStreamSource(state.stream); const worklet = new AudioWorkletNode(state.inputContext, 'pcm16-downsampler'); const silentGain = state.inputContext.createGain(); silentGain.gain.value = 0; source.connect(worklet).connect(silentGain).connect(state.inputContext.destination); state.worklet = worklet;
  worklet.port.onmessage = ({ data }) => { if (!state.session || state.muted || !(data instanceof ArrayBuffer)) return; state.session.sendRealtimeInput({ audio: { data: arrayBufferToBase64(data), mimeType: 'audio/pcm;rate=16000' } }); };
  if (!elements.vadToggle.checked) state.session.sendRealtimeInput({ activityStart: {} });
}
async function stopMicrophone({ notify = true } = {}) { if (notify && state.session) state.session.sendRealtimeInput(elements.vadToggle.checked ? { audioStreamEnd: true } : { activityEnd: {} }); state.worklet?.disconnect(); state.stream?.getTracks().forEach((track) => track.stop()); if (state.inputContext && state.inputContext.state !== 'closed') await state.inputContext.close(); state.worklet = null; state.stream = null; state.inputContext = null; }

function toolDeclaration(sdk, name, description, properties, required = []) { return { name, description, behavior: sdk.Behavior.NON_BLOCKING, parameters: { type: sdk.Type.OBJECT, properties, required } }; }
function createLiveConfig(sdk) {
  const config = { responseModalities: [sdk.Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: elements.voiceSelect.value } } }, realtimeInputConfig: { automaticActivityDetection: { disabled: !elements.vadToggle.checked } }, contextWindowCompression: { slidingWindow: {} }, sessionResumption: state.latestResumeHandle ? { handle: state.latestResumeHandle } : {}, systemInstruction: buildSystemInstruction(), tools: [{ functionDeclarations: [
    toolDeclaration(sdk, 'save_note', 'Save a note locally after the user asks to remember something.', { title: { type: sdk.Type.STRING, description: 'Short title for the note.' }, body: { type: sdk.Type.STRING, description: 'The remembered content.' } }),
    toolDeclaration(sdk, 'list_notes', 'List the user\'s locally stored notes.', {}),
    toolDeclaration(sdk, 'update_personalization', 'Update local name, context, or response style only when asked by the user.', { name: { type: sdk.Type.STRING }, context: { type: sdk.Type.STRING }, style: { type: sdk.Type.STRING, enum: ['concise', 'balanced', 'detailed'] } }),
    toolDeclaration(sdk, 'get_local_time', 'Return the current time for an IANA timezone.', { timeZone: { type: sdk.Type.STRING, description: 'IANA timezone such as America/Sao_Paulo.' } }, ['timeZone']),
  ] }] };
  if (elements.inputTranscriptToggle.checked) config.inputAudioTranscription = {}; if (elements.outputTranscriptToggle.checked) config.outputAudioTranscription = {}; return config;
}
function validateTimeZone(value) { if (typeof value !== 'string' || value.length > 80) throw new Error('Invalid timezone'); new Intl.DateTimeFormat('en', { timeZone: value }).format(); return value; }
async function executeToolCall(call) {
  if (!call.id) throw new Error('Tool call is missing an id'); const controller = new AbortController(); state.inFlightTools.set(call.id, controller); addEvent('tool', `Running ${call.name}`);
  try { let result; if (call.name === 'save_note') result = saveNote(call.args ?? {}); else if (call.name === 'list_notes') result = { notes: state.notes.map(({ title, body, updatedAt }) => ({ title, body, updatedAt })) }; else if (call.name === 'update_personalization') result = savePreferences({ ...state.preferences, ...call.args }); else if (call.name === 'get_local_time') { const timeZone = validateTimeZone(call.args?.timeZone); result = { timeZone, localTime: new Intl.DateTimeFormat('en', { timeZone, dateStyle: 'full', timeStyle: 'long' }).format(new Date()) }; } else throw new Error(`Unknown tool: ${call.name}`); if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError'); addEvent('tool', `${call.name} completed`); return { id: call.id, name: call.name, response: { result, scheduling: state.sdk.FunctionResponseScheduling.WHEN_IDLE } }; }
  catch (error) { const message = error instanceof Error ? error.message : 'Tool failed'; addEvent('error', `${call.name}: ${message}`); return { id: call.id, name: call.name, response: { error: message } }; }
  finally { state.inFlightTools.delete(call.id); }
}
async function handleServerMessage(message) {
  const content = message.serverContent;
  for (const part of content?.modelTurn?.parts ?? []) if (part.inlineData?.data) await enqueueOutputAudio(part.inlineData.data);
  if (content?.inputTranscription?.text) { addTranscript('You', content.inputTranscription.text); addEvent('transcript', 'Input transcript finalized'); }
  if (content?.outputTranscription?.text) { addTranscript('Gemini', content.outputTranscription.text); addEvent('transcript', 'Output transcript received'); }
  if (content?.interrupted) { clearPlayback(); addEvent('session', 'Model generation interrupted'); }
  if (content?.generationComplete) addEvent('session', 'Generation complete'); if (content?.turnComplete && state.phase === 'connected') setStage(state.muted ? 'muted' : 'listening', state.muted ? 'Microphone muted' : 'Listening', state.muted ? 'Unmute to continue.' : 'Talk, type, or ask me to save a note.');
  for (const id of message.toolCallCancellation?.ids ?? []) { state.inFlightTools.get(id)?.abort(); addEvent('tool', `Cancellation received for ${id}`); }
  if (message.toolCall?.functionCalls?.length) state.session?.sendToolResponse({ functionResponses: await Promise.all(message.toolCall.functionCalls.map(executeToolCall)) });
  if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate.newHandle) { state.latestResumeHandle = message.sessionResumptionUpdate.newHandle; addEvent('session', 'Resumption handle updated'); }
  if (message.goAway) addEvent('session', `Server GoAway: ${message.goAway.timeLeft ?? 'soon'}`);
}
function currentApiKey() { return elements.apiKeyInput.value.trim() || state.apiKey; }
function isValidModel(value) { return /^[a-zA-Z0-9._-]{3,120}$/.test(value); }
async function startLiveSession() {
  if (!window.isSecureContext && location.hostname !== 'localhost') throw new Error('Microphone capture requires HTTPS or localhost.');
  const apiKey = currentApiKey(); if (!apiKey) throw new Error('Paste your Gemini API key in Connection & preferences first.');
  const model = elements.modelInput.value.trim(); if (!isValidModel(model)) throw new Error('Enter a valid Gemini model name.');
  state.apiKey = apiKey; if (elements.rememberKeyToggle.checked) localStorage.setItem(STORAGE.apiKey, apiKey); else localStorage.removeItem(STORAGE.apiKey);
  setConnection('connecting', 'Connecting'); setStage('idle', 'Connecting to Gemini', 'Opening a direct browser connection…'); addEvent('session', 'Loading Gemini browser client');
  state.sdk ??= await import(SDK_URL); const ai = new state.sdk.GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  state.session = await ai.live.connect({ model, config: createLiveConfig(state.sdk), callbacks: { onopen: () => addEvent('session', 'WebSocket opened'), onmessage: (message) => { void handleServerMessage(message); }, onerror: (event) => { addEvent('error', event.message || 'Live session error'); setConnection('error', 'Connection error'); }, onclose: (event) => addEvent('session', `Socket closed: ${event.code || 'unknown'} ${event.reason || ''}`.trim()) } });
  await startMicrophone(); setConnection('connected', 'Connected'); setStage('listening', 'Listening', 'Talk, type, or ask me to save a note.'); addEvent('audio', 'Microphone streaming started');
}
function sendInstruction(text) { const clean = text.trim(); if (!clean || !state.session) return; state.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: clean }] }], turnComplete: true }); addTranscript('You', clean); addEvent('session', 'Text message sent'); setStage('idle', 'Thinking', 'Gemini is responding…'); }
async function startSession() { if (state.phase !== 'disconnected' && state.phase !== 'error') return; updateSessionControls(true); state.muted = false; elements.muteButton.setAttribute('aria-pressed', 'false'); elements.muteLabel.textContent = 'Mute'; try { await startLiveSession(); } catch (error) { const message = error instanceof Error ? error.message : 'Unable to start session'; addEvent('error', message); setConnection('error', 'Start failed'); setStage('idle', 'Could not connect', message); updateSessionControls(false); await stopMicrophone({ notify: false }); state.session?.close(); state.session = null; } }
async function toggleMute() { if (state.phase !== 'connected') return; state.muted = !state.muted; elements.muteButton.setAttribute('aria-pressed', String(state.muted)); elements.muteLabel.textContent = state.muted ? 'Unmute' : 'Mute'; state.stream?.getAudioTracks().forEach((track) => { track.enabled = !state.muted; }); if (state.muted) state.session?.sendRealtimeInput(elements.vadToggle.checked ? { audioStreamEnd: true } : { activityEnd: {} }); else if (!elements.vadToggle.checked) state.session?.sendRealtimeInput({ activityStart: {} }); addEvent('audio', state.muted ? 'Microphone muted' : 'Microphone unmuted'); setStage(state.muted ? 'muted' : 'listening', state.muted ? 'Microphone muted' : 'Listening', state.muted ? 'No microphone audio is being sent.' : 'Talk, type, or ask me to save a note.'); }
async function endSession() { for (const controller of state.inFlightTools.values()) controller.abort(); state.inFlightTools.clear(); await stopMicrophone({ notify: true }); clearPlayback(); state.session?.close(); state.session = null; state.muted = false; setConnection('disconnected', 'Disconnected'); setStage('idle', 'Ready to connect', 'Add your key in Settings, then start a live session.'); updateSessionControls(false); elements.muteButton.setAttribute('aria-pressed', 'false'); elements.muteLabel.textContent = 'Mute'; addEvent('session', 'Session ended'); }

elements.startButton.addEventListener('click', () => { void startSession(); }); elements.muteButton.addEventListener('click', () => { void toggleMute(); }); elements.endButton.addEventListener('click', () => { void endSession(); });
elements.showKeyButton.addEventListener('click', () => { const visible = elements.apiKeyInput.type === 'text'; elements.apiKeyInput.type = visible ? 'password' : 'text'; elements.showKeyButton.textContent = visible ? 'Show' : 'Hide'; elements.showKeyButton.setAttribute('aria-label', visible ? 'Show API key' : 'Hide API key'); });
elements.rememberKeyToggle.addEventListener('change', () => { if (!elements.rememberKeyToggle.checked) localStorage.removeItem(STORAGE.apiKey); });
elements.savePreferencesButton.addEventListener('click', () => { savePreferences(); if (state.session) sendInstruction('The user updated their local personalization. Acknowledge it and adapt for the rest of this session.'); });
elements.instructionForm.addEventListener('submit', (event) => { event.preventDefault(); sendInstruction(elements.instructionInput.value); elements.instructionInput.value = ''; });
elements.noteForm.addEventListener('submit', (event) => { event.preventDefault(); try { saveNote({ title: elements.noteTitleInput.value, body: elements.noteBodyInput.value }); elements.noteTitleInput.value = ''; elements.noteBodyInput.value = ''; } catch (error) { addEvent('error', error instanceof Error ? error.message : 'Could not save note'); } });
elements.clearNotesButton.addEventListener('click', () => { state.notes = []; persistNotes(); addEvent('tool', 'All local notes cleared'); });
elements.clearTranscriptButton.addEventListener('click', () => { elements.transcriptList.replaceChildren(); const empty = document.createElement('li'); empty.className = 'empty-state'; empty.textContent = 'No transcript yet. Start a session to begin.'; elements.transcriptList.append(empty); });
elements.clearEventsButton.addEventListener('click', () => elements.eventList.replaceChildren()); window.addEventListener('beforeunload', () => { state.stream?.getTracks().forEach((track) => track.stop()); state.session?.close(); });

applyPreferences(safeParse(localStorage.getItem(STORAGE.preferences), {})); state.notes = safeParse(localStorage.getItem(STORAGE.notes), []); if (!Array.isArray(state.notes)) state.notes = []; renderNotes(); const savedKey = localStorage.getItem(STORAGE.apiKey); if (savedKey) { state.apiKey = savedKey; elements.apiKeyInput.value = savedKey; elements.rememberKeyToggle.checked = true; } updateSessionControls(false);
