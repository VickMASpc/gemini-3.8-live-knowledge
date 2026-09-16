/**
 * Gemini 3.8 Live Studio — Interactive Web Client
 * Built for gemini-3.8-live over WebSockets in browser JavaScript.
 */

// Global State
const state = {
  ws: null,
  connected: false,
  connecting: false,
  apiKey: '',
  model: 'gemini-3.8-live',
  voice: 'Kore',

  // Audio Capture (Mic)
  micStream: null,
  audioCtxInput: null,
  processorNode: null,
  isMicActive: false,

  // Audio Playback (Model Output)
  audioCtxOutput: null,
  nextStartTime: 0,
  scheduledSources: [],
  isPlaying: false,

  // Camera Stream
  cameraStream: null,
  isCameraActive: false,
  autoStreamInterval: null,

  // Transcripts & Turn Tracking
  currentUserTurnBubble: null,
  currentModelTurnBubble: null,

  // Visualizer Animation
  animFrameId: null,
  audioLevel: 0
};

// Tool Declarations for Gemini 3.8 Live
const CLIENT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_current_weather',
        description: 'Get the current weather conditions for a location.',
        parameters: {
          type: 'OBJECT',
          properties: {
            location: { type: 'STRING', description: 'City and state, e.g. San Francisco, CA' }
          },
          required: ['location']
        }
      },
      {
        name: 'get_system_time',
        description: 'Get the current system time and timezone.',
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      },
      {
        name: 'calculate_expression',
        description: 'Evaluate a mathematical expression.',
        parameters: {
          type: 'OBJECT',
          properties: {
            expression: { type: 'STRING', description: 'Math expression e.g. 15 * 4 + 10' }
          },
          required: ['expression']
        }
      }
    ]
  }
];

// DOM Elements
const elements = {
  apiKeyInput: document.getElementById('apiKeyInput'),
  toggleKeyVis: document.getElementById('toggleKeyVis'),
  rememberKey: document.getElementById('rememberKey'),
  connectBtn: document.getElementById('connectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  modelSelect: document.getElementById('modelSelect'),
  voiceSelect: document.getElementById('voiceSelect'),
  systemInstructionInput: document.getElementById('systemInstructionInput'),
  enableToolsCheck: document.getElementById('enableToolsCheck'),
  
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  
  cameraVideo: document.getElementById('cameraVideo'),
  cameraOverlay: document.getElementById('cameraOverlay'),
  snapshotCanvas: document.getElementById('snapshotCanvas'),
  toggleCameraBtn: document.getElementById('toggleCameraBtn'),
  sendFrameBtn: document.getElementById('sendFrameBtn'),
  autoStreamVideo: document.getElementById('autoStreamVideo'),
  
  micBtn: document.getElementById('micBtn'),
  micIcon: document.getElementById('micIcon'),
  micLabel: document.getElementById('micLabel'),
  interruptBtn: document.getElementById('interruptBtn'),
  audioStateBadge: document.getElementById('audioStateBadge'),
  waveformCanvas: document.getElementById('waveformCanvas'),
  
  chatFeed: document.getElementById('chatFeed'),
  clearChatBtn: document.getElementById('clearChatBtn'),
  textTurnForm: document.getElementById('textTurnForm'),
  textInput: document.getElementById('textInput'),
  sendTextBtn: document.getElementById('sendTextBtn'),
  
  eventLog: document.getElementById('eventLog'),
  tokenUsage: document.getElementById('tokenUsage')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadSavedApiKey();
  setupEventListeners();
  initCanvasVisualizer();
});

// Load saved key from sessionStorage if present
function loadSavedApiKey() {
  const saved = sessionStorage.getItem('gemini_api_key');
  if (saved) {
    elements.apiKeyInput.value = saved;
  }
}

function setupEventListeners() {
  // Key visibility toggle
  elements.toggleKeyVis.addEventListener('click', () => {
    const type = elements.apiKeyInput.type === 'password' ? 'text' : 'password';
    elements.apiKeyInput.type = type;
  });

  // Connect / Disconnect
  elements.connectBtn.addEventListener('click', connectLiveSession);
  elements.disconnectBtn.addEventListener('click', disconnectLiveSession);

  // Mic & Interruption
  elements.micBtn.addEventListener('click', toggleMicrophone);
  elements.interruptBtn.addEventListener('click', triggerBargeIn);

  // Text Turn
  elements.textTurnForm.addEventListener('submit', handleTextSubmit);

  // Camera controls
  elements.toggleCameraBtn.addEventListener('click', toggleCamera);
  elements.sendFrameBtn.addEventListener('click', captureAndSendFrame);
  elements.autoStreamVideo.addEventListener('change', handleAutoStreamToggle);

  // Clear chat
  elements.clearChatBtn.addEventListener('click', () => {
    elements.chatFeed.innerHTML = '';
  });
}

// ==========================================
// WebSocket Connection Lifecycle
// ==========================================
function connectLiveSession() {
  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter a valid Gemini API Key.');
    return;
  }

  if (elements.rememberKey.checked) {
    sessionStorage.setItem('gemini_api_key', apiKey);
  } else {
    sessionStorage.removeItem('gemini_api_key');
  }

  state.apiKey = apiKey;
  state.model = elements.modelSelect.value;
  state.voice = elements.voiceSelect.value;

  updateConnectionStatus('connecting', 'Connecting...');
  logEvent('Connecting to Gemini 3.8 Live WebSocket...', 'info');

  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      state.connected = true;
      state.connecting = false;
      updateConnectionStatus('connected', 'Connected');
      logEvent('WebSocket connection opened. Sending setup payload...', 'success');
      sendSetupPayload();
      enableControls(true);
    };

    state.ws.onmessage = (event) => {
      handleServerMessage(event.data);
    };

    state.ws.onerror = (error) => {
      logEvent('WebSocket error observed.', 'error');
      console.error('WebSocket Error:', error);
    };

    state.ws.onclose = (event) => {
      state.connected = false;
      state.connecting = false;
      updateConnectionStatus('disconnected', `Disconnected (${event.code})`);
      logEvent(`Connection closed. Code: ${event.code}, Reason: ${event.reason || 'None'}`, 'error');
      enableControls(false);
      stopMicrophone();
      stopCamera();
    };
  } catch (err) {
    logEvent(`Failed to establish connection: ${err.message}`, 'error');
    updateConnectionStatus('disconnected', 'Disconnected');
  }
}

function disconnectLiveSession() {
  if (state.ws) {
    logEvent('Disconnecting live session intentionally.', 'info');
    state.ws.close();
  }
}

function sendSetupPayload() {
  const systemText = elements.systemInstructionInput.value.trim() || 'You are a helpful and articulate AI voice assistant.';

  const setupMsg = {
    setup: {
      model: `models/${state.model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: state.voice
            }
          }
        }
      },
      systemInstruction: {
        parts: [{ text: systemText }]
      }
    }
  };

  if (elements.enableToolsCheck.checked) {
    setupMsg.setup.tools = CLIENT_TOOLS;
  }

  state.ws.send(JSON.stringify(setupMsg));
}

// ==========================================
// Routing Server Events
// ==========================================
function handleServerMessage(data) {
  let message;
  try {
    if (data instanceof Blob) {
      data.text().then((txt) => handleParsedMessage(JSON.parse(txt)));
      return;
    }
    message = JSON.parse(data);
  } catch (e) {
    logEvent('Failed to parse incoming WebSocket frame as JSON', 'error');
    return;
  }
  handleParsedMessage(message);
}

function handleParsedMessage(msg) {
  // 1. Setup Complete
  if (msg.setupComplete) {
    logEvent('Session Setup Complete! Ready for voice, vision, and text input.', 'success');
    setAudioBadge('Ready', 'listening');
    return;
  }

  // 2. Server Content & Transcripts
  if (msg.serverContent) {
    const sc = msg.serverContent;

    // Handle Interruption
    if (sc.interrupted) {
      logEvent('Generation interrupted by user action / barge-in.', 'info');
      stopAudioPlayback();
      setAudioBadge('Interrupted', 'listening');
    }

    // Model Turn Parts (Audio & Text)
    if (sc.modelTurn && sc.modelTurn.parts) {
      setAudioBadge('Generating Audio', 'generating');
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData && part.inlineData.data) {
          playPcm24kChunk(part.inlineData.data);
        }
        if (part.text) {
          appendModelTranscript(part.text);
        }
      }
    }

    // Input Audio Transcript
    if (sc.inputTranscription && sc.inputTranscription.text) {
      appendUserTranscript(sc.inputTranscription.text);
    }

    // Output Audio Transcript
    if (sc.outputTranscription && sc.outputTranscription.text) {
      appendModelTranscript(sc.outputTranscription.text);
    }

    // Turn Completion Signals
    if (sc.generationComplete) {
      logEvent('Model generation complete.', 'info');
    }

    if (sc.turnComplete) {
      logEvent('Turn complete.', 'info');
      state.currentModelTurnBubble = null;
      state.currentUserTurnBubble = null;
      if (!state.isPlaying) {
        setAudioBadge('Ready', 'listening');
      }
    }
  }

  // 3. Tool Calls (Client-side execution loop)
  if (msg.toolCall && msg.toolCall.functionCalls) {
    handleIncomingToolCalls(msg.toolCall.functionCalls);
  }

  // 4. Usage Metadata
  if (msg.usageMetadata) {
    const total = msg.usageMetadata.totalTokenCount || 0;
    elements.tokenUsage.textContent = `Tokens: ${total}`;
  }
}

// ==========================================
// Audio Capture (Input PCM 16kHz Mono)
// ==========================================
async function toggleMicrophone() {
  if (state.isMicActive) {
    stopMicrophone();
  } else {
    await startMicrophone();
  }
}

async function startMicrophone() {
  try {
    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000
      }
    });

    state.audioCtxInput = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = state.audioCtxInput.createMediaStreamSource(state.micStream);

    // Use ScriptProcessorNode for wide browser compatibility
    state.processorNode = state.audioCtxInput.createScriptProcessor(2048, 1, 1);

    state.processorNode.onaudioprocess = (e) => {
      if (!state.connected || !state.isMicActive) return;

      const inputBuffer = e.inputBuffer.getChannelData(0);
      
      // Calculate audio amplitude level for visualization
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      state.audioLevel = Math.sqrt(sum / inputBuffer.length);

      // Convert Float32Array to Int16Array PCM
      const pcmInt16 = new Int16Array(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        pcmInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const bytes = new Uint8Array(pcmInt16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      // Stream realtime input over WebSocket
      sendRealtimeInputAudio(base64Data);
    };

    source.connect(state.processorNode);
    state.processorNode.connect(state.audioCtxInput.destination);

    state.isMicActive = true;
    elements.micBtn.classList.add('active');
    elements.micLabel.textContent = 'Mic Live';
    logEvent('Microphone stream started (PCM 16kHz mono).', 'info');
  } catch (err) {
    logEvent(`Microphone access error: ${err.message}`, 'error');
  }
}

function stopMicrophone() {
  if (state.processorNode) {
    state.processorNode.disconnect();
    state.processorNode = null;
  }
  if (state.audioCtxInput) {
    state.audioCtxInput.close();
    state.audioCtxInput = null;
  }
  if (state.micStream) {
    state.micStream.getTracks().forEach(track => track.stop());
    state.micStream = null;
  }

  state.isMicActive = false;
  elements.micBtn.classList.remove('active');
  elements.micLabel.textContent = 'Muted';

  if (state.connected) {
    sendAudioStreamEnd();
  }
  logEvent('Microphone stream stopped.', 'info');
}

function sendRealtimeInputAudio(base64Data) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

  const payload = {
    realtimeInput: {
      mediaChunks: [
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64Data
        }
      ]
    }
  };
  state.ws.send(JSON.stringify(payload));
}

function sendAudioStreamEnd() {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  state.ws.send(JSON.stringify({
    realtimeInput: {
      audioStreamEnd: true
    }
  }));
}

// ==========================================
// Audio Playback (Output PCM 24kHz Mono)
// ==========================================
function playPcm24kChunk(base64Data) {
  if (!state.audioCtxOutput) {
    state.audioCtxOutput = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
  }

  if (state.audioCtxOutput.state === 'suspended') {
    state.audioCtxOutput.resume();
  }

  // Base64 decode to Int16
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);

  // Convert to Float32Array [-1.0, 1.0]
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }

  // Create AudioBuffer
  const buffer = state.audioCtxOutput.createBuffer(1, float32Array.length, 24000);
  buffer.getChannelData(0).set(float32Array);

  const source = state.audioCtxOutput.createBufferSource();
  source.buffer = buffer;
  source.connect(state.audioCtxOutput.destination);

  const currentTime = state.audioCtxOutput.currentTime;
  if (state.nextStartTime < currentTime) {
    state.nextStartTime = currentTime;
  }

  source.start(state.nextStartTime);
  state.nextStartTime += buffer.duration;
  state.scheduledSources.push(source);

  state.isPlaying = true;
  setAudioBadge('Playing Audio', 'playing');

  source.onended = () => {
    const idx = state.scheduledSources.indexOf(source);
    if (idx !== -1) state.scheduledSources.splice(idx, 1);
    if (state.scheduledSources.length === 0) {
      state.isPlaying = false;
      setAudioBadge('Ready', 'listening');
    }
  };
}

function stopAudioPlayback() {
  for (const src of state.scheduledSources) {
    try { src.stop(); } catch (e) {}
  }
  state.scheduledSources = [];
  state.isPlaying = false;
  if (state.audioCtxOutput) {
    state.nextStartTime = state.audioCtxOutput.currentTime;
  }
}

function triggerBargeIn() {
  stopAudioPlayback();
  logEvent('Barge-in triggered manually.', 'info');
  // Send turn complete to cut off server generation on 3.8 Live
  if (state.ws && state.ws.readyState !== WebSocket.OPEN) return;
  state.ws.send(JSON.stringify({
    clientContent: {
      turns: [{ role: 'user', parts: [{ text: '[Interrupted]' }] }],
      turnComplete: true
    }
  }));
}

// ==========================================
// Client Text Input Submission
// ==========================================
function handleTextSubmit(e) {
  e.preventDefault();
  const text = elements.textInput.value.trim();
  if (!text || !state.connected) return;

  // Interrupt current playback on text submit
  stopAudioPlayback();
  appendUserTranscript(text);

  // Send turn content with turnComplete: true
  const payload = {
    clientContent: {
      turns: [
        {
          role: 'user',
          parts: [{ text: text }]
        }
      ],
      turnComplete: true
    }
  };

  state.ws.send(JSON.stringify(payload));
  elements.textInput.value = '';
  logEvent(`Sent text turn: "${text}"`, 'info');
}

// ==========================================
// Tool Execution Loop
// ==========================================
async function handleIncomingToolCalls(functionCalls) {
  const responses = [];

  for (const call of functionCalls) {
    logEvent(`Tool requested by model: ${call.name}(${JSON.stringify(call.args)})`, 'tool');
    let result;

    if (call.name === 'get_current_weather') {
      const loc = call.args.location || 'Unknown';
      result = { location: loc, temperature: '72°F', condition: 'Sunny with light breeze', humidity: '45%' };
    } else if (call.name === 'get_system_time') {
      result = { isoTime: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    } else if (call.name === 'calculate_expression') {
      try {
        // Safe evaluation simulation
        const expr = call.args.expression;
        const calc = Function(`"use strict"; return (${expr})`)();
        result = { expression: expr, result: calc };
      } catch (err) {
        result = { error: 'Invalid math expression' };
      }
    } else {
      result = { error: `Tool ${call.name} not implemented.` };
    }

    logEvent(`Executing tool ${call.name} -> ${JSON.stringify(result)}`, 'tool');

    responses.push({
      id: call.id,
      name: call.name,
      response: { result: result }
    });
  }

  // Send tool responses back
  const toolResponsePayload = {
    toolResponse: {
      functionResponses: responses
    }
  };

  state.ws.send(JSON.stringify(toolResponsePayload));
  logEvent('Sent functionResponses to Gemini session.', 'success');
}

// ==========================================
// Camera & Vision Features
// ==========================================
async function toggleCamera() {
  if (state.isCameraActive) {
    stopCamera();
  } else {
    await startCamera();
  }
}

async function startCamera() {
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, frameRate: 15 }
    });
    elements.cameraVideo.srcObject = state.cameraStream;
    elements.cameraOverlay.style.display = 'none';
    state.isCameraActive = true;
    elements.toggleCameraBtn.textContent = 'Stop Camera';
    elements.sendFrameBtn.disabled = !state.connected;
    logEvent('Camera started.', 'info');
  } catch (err) {
    logEvent(`Camera access error: ${err.message}`, 'error');
  }
}

function stopCamera() {
  if (state.autoStreamInterval) {
    clearInterval(state.autoStreamInterval);
    state.autoStreamInterval = null;
  }
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  elements.cameraVideo.srcObject = null;
  elements.cameraOverlay.style.display = 'flex';
  state.isCameraActive = false;
  elements.toggleCameraBtn.textContent = 'Start Camera';
  elements.sendFrameBtn.disabled = true;
  elements.autoStreamVideo.checked = false;
  logEvent('Camera stopped.', 'info');
}

function captureAndSendFrame() {
  if (!state.isCameraActive || !state.connected) return;

  const video = elements.cameraVideo;
  const canvas = elements.snapshotCanvas;
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Compress frame as JPEG
  const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
  const base64Jpeg = dataUrl.split(',')[1];

  const payload = {
    realtimeInput: {
      mediaChunks: [
        {
          mimeType: 'image/jpeg',
          data: base64Jpeg
        }
      ]
    }
  };

  state.ws.send(JSON.stringify(payload));
  logEvent('Sent camera video frame (JPEG) to Gemini Live.', 'info');
}

function handleAutoStreamToggle() {
  if (elements.autoStreamVideo.checked) {
    if (!state.isCameraActive) {
      alert('Please start the camera first.');
      elements.autoStreamVideo.checked = false;
      return;
    }
    // Stream 1 frame every 1.5s (compliant with max 1 FPS rule)
    state.autoStreamInterval = setInterval(captureAndSendFrame, 1500);
    logEvent('Auto video streaming enabled (1 frame / 1.5s).', 'info');
  } else {
    if (state.autoStreamInterval) {
      clearInterval(state.autoStreamInterval);
      state.autoStreamInterval = null;
    }
    logEvent('Auto video streaming disabled.', 'info');
  }
}

// ==========================================
// Chat UI & Transcripts
// ==========================================
function appendUserTranscript(text) {
  if (!text) return;
  if (!state.currentUserTurnBubble) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.innerHTML = `<div class="sender">You</div><div class="text"></div>`;
    elements.chatFeed.appendChild(bubble);
    state.currentUserTurnBubble = bubble.querySelector('.text');
  }
  state.currentUserTurnBubble.textContent = text;
  elements.chatFeed.scrollTop = elements.chatFeed.scrollHeight;
}

function appendModelTranscript(text) {
  if (!text) return;
  if (!state.currentModelTurnBubble) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble model';
    bubble.innerHTML = `<div class="sender">Gemini 3.8</div><div class="text"></div>`;
    elements.chatFeed.appendChild(bubble);
    state.currentModelTurnBubble = bubble.querySelector('.text');
  }
  state.currentModelTurnBubble.textContent += text;
  elements.chatFeed.scrollTop = elements.chatFeed.scrollHeight;
}

// ==========================================
// Helper Functions & UI updates
// ==========================================
function updateConnectionStatus(type, label) {
  elements.statusDot.className = `status-dot ${type}`;
  elements.statusText.textContent = label;
}

function setAudioBadge(label, stateClass) {
  elements.audioStateBadge.textContent = label;
  elements.audioStateBadge.className = `audio-state-badge ${stateClass}`;
}

function enableControls(enabled) {
  elements.connectBtn.disabled = enabled;
  elements.disconnectBtn.disabled = !enabled;
  elements.micBtn.disabled = !enabled;
  elements.interruptBtn.disabled = !enabled;
  elements.textInput.disabled = !enabled;
  elements.sendTextBtn.disabled = !enabled;
  elements.sendFrameBtn.disabled = !enabled || !state.isCameraActive;
}

function logEvent(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.innerHTML = `<span class="time">[${time}]</span> ${escapeHtml(msg)}`;
  elements.eventLog.appendChild(div);
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ==========================================
// Waveform Canvas Visualizer
// ==========================================
function initCanvasVisualizer() {
  const canvas = elements.waveformCanvas;
  const ctx = canvas.getContext('2d');
  
  function draw() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const time = Date.now() * 0.005;
    const level = state.isMicActive ? Math.max(0.1, state.audioLevel * 10) : (state.isPlaying ? 0.6 : 0.05);

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = state.isPlaying ? '#6366f1' : (state.isMicActive ? '#10b981' : '#374151');

    for (let x = 0; x < canvas.width; x += 4) {
      const y = canvas.height / 2 + Math.sin(x * 0.03 + time) * 20 * level;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    state.animFrameId = requestAnimationFrame(draw);
  }

  draw();
}
