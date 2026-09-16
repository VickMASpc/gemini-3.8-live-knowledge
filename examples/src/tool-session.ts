import {
  Behavior,
  FunctionResponseScheduling,
  GoogleGenAI,
  Modality,
  Type,
  type FunctionCall,
  type LiveServerMessage,
  type Session,
} from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY in the server environment.');

const inFlight = new Map<string, AbortController>();
let session: Session;

const orderTool = {
  name: 'get_order_status',
  description: 'Get the current status for one public order ID.',
  behavior: Behavior.NON_BLOCKING,
  parameters: {
    type: Type.OBJECT,
    properties: {
      orderId: {
        type: Type.STRING,
        description: 'Public order ID in the form A-123.',
      },
    },
    required: ['orderId'],
  },
};

function parseArgs(call: FunctionCall): { orderId: string } {
  const orderId = call.args?.orderId;
  if (typeof orderId !== 'string' || !/^[A-Z]-\d{3,12}$/.test(orderId)) {
    throw new Error('orderId must match A-123');
  }
  return { orderId };
}

async function lookupOrder(
  { orderId }: { orderId: string },
  signal: AbortSignal,
): Promise<{ orderId: string; status: string }> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 100);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('cancelled'));
    }, { once: true });
  });
  return { orderId, status: 'packed' }; // Replace with an authorized backend call.
}

async function execute(call: FunctionCall) {
  if (!call.id) throw new Error('Tool call has no id');
  if (call.name !== 'get_order_status') throw new Error('Unknown tool');
  const controller = new AbortController();
  inFlight.set(call.id, controller);
  try {
    const result = await lookupOrder(parseArgs(call), controller.signal);
    return {
      id: call.id,
      name: call.name,
      response: {
        result,
        scheduling: FunctionResponseScheduling.WHEN_IDLE,
      },
    };
  } catch (error) {
    return {
      id: call.id,
      name: call.name,
      response: { error: error instanceof Error ? error.message : 'tool failed' },
    };
  } finally {
    inFlight.delete(call.id);
  }
}

async function onMessage(message: LiveServerMessage): Promise<void> {
  for (const id of message.toolCallCancellation?.ids ?? []) {
    inFlight.get(id)?.abort();
  }

  const calls = message.toolCall?.functionCalls ?? [];
  if (calls.length) {
    const functionResponses = await Promise.all(calls.map(execute));
    session.sendToolResponse({ functionResponses });
  }

  if (message.serverContent?.outputTranscription?.text) {
    console.log('Gemini:', message.serverContent.outputTranscription.text);
  }
  if (message.serverContent?.turnComplete) session.close();
}

const ai = new GoogleGenAI({ apiKey });
session = await ai.live.connect({
  model: 'gemini-3.8-live',
  config: {
    responseModalities: [Modality.AUDIO],
    outputAudioTranscription: {},
    tools: [{ functionDeclarations: [orderTool] }],
    systemInstruction: `You are an order assistant. Call get_order_status only
after the user provides an order ID. Never claim success before the tool result.`,
  },
  callbacks: {
    onopen: () => console.log('opened'),
    onmessage: (message) => { void onMessage(message); },
    onerror: (event) => console.error(event),
    onclose: () => console.log('closed'),
  },
});

session.sendClientContent({
  turns: [{ role: 'user', parts: [{ text: 'What is the status of order A-123?' }] }],
  turnComplete: true,
});
