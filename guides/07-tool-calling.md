# Tool calling — production guide

Tags: `#tool-calling` `#function-calling` `#security` `#async` `#cancellation`

Live tool calling is a client-managed protocol. The SDK does **not** automatically execute or return tool results.

## 1. Declare narrow, typed tools

```ts
import { Behavior, Modality, Type } from '@google/genai';

const tools = [{
  functionDeclarations: [{
    name: 'get_order_status',
    description: 'Look up one order only after the user provides its public order ID.',
    behavior: Behavior.NON_BLOCKING, // default for Gemini 3.8; explicit for clarity
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: {
          type: Type.STRING,
          description: 'Public order ID such as A-102; never a database primary key.',
        },
      },
      required: ['orderId'],
    },
  }],
}];

const config = {
  responseModalities: [Modality.AUDIO],
  tools,
  systemInstruction: `You are an order assistant.
Call get_order_status only after the user supplies an order ID.
Never invent an order ID or claim a tool succeeded before its result arrives.`,
};
```

Prefer descriptive names, precise invocation conditions, enums and required properties. Keep the active tool set small (Google’s general guidance suggests about 10–20 maximum).

## 2. Dispatch with an allowlist and validation

```ts
const handlers = {
  get_order_status: async (args: { orderId: string }, signal: AbortSignal) => {
    if (!/^[A-Z]-\d{3,12}$/.test(args.orderId)) {
      throw new Error('invalid orderId');
    }
    return orderService.lookup(args.orderId, { signal });
  },
} as const;
```

Never evaluate a function name, import a path from model output, interpolate arguments into SQL/shell, or trust authorization claims in arguments. Re-authorize the end user for every privileged call.

## 3. Receive every call, preserve IDs, return every result

```ts
async function handleToolCall(message: any, session: any) {
  const calls = message.toolCall?.functionCalls ?? [];
  const responses = await Promise.all(calls.map(async (call: any) => {
    try {
      const handler = handlers[call.name as keyof typeof handlers];
      if (!handler) throw new Error('unknown tool');
      const controller = new AbortController();
      inFlight.set(call.id, controller);
      const result = await handler(call.args, controller.signal);
      return { id: call.id, name: call.name, response: { result } };
    } catch (error) {
      return {
        id: call.id,
        name: call.name,
        response: { error: error instanceof Error ? error.message : 'tool failed' },
      };
    } finally {
      inFlight.delete(call.id);
    }
  }));

  session.sendToolResponse({ functionResponses: responses });
}
```

The model can issue multiple calls in one event. Match results using both `id` and `name`; do not assume list order.

## Blocking vs non-blocking

| Declaration behavior | Conversation | Use for |
|---|---|---|
| `Behavior.NON_BLOCKING` | Conversation may continue while tool runs; Gemini 3.8 default | Searches, long reads, background operations |
| `Behavior.BLOCKING` | Model waits for result | Strict sequential dependencies, short calls |

For non-blocking calls, choose how the late result affects speech by putting scheduling in the function response:

```ts
import { FunctionResponseScheduling } from '@google/genai';

const response = {
  id: call.id,
  name: call.name,
  response: {
    result,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
};
```

| Scheduling | Behavior |
|---|---|
| `INTERRUPT` / SDK enum spelling | Interrupt current work and report immediately |
| `WHEN_IDLE` | Wait until current output finishes |
| `SILENT` | Incorporate result without proactively speaking |

Google documentation currently uses both “INTERRUPT” in tool examples and “INTERRUPTED” in some 3.8 summary text. Use the enum exported by your installed SDK and type-check; do not hard-code a guessed string.

## Cancellation

```ts
for (const id of message.toolCallCancellation?.ids ?? []) {
  inFlight.get(id)?.abort();
  inFlight.delete(id);
}
```

Cancellation is advisory and may race completion. For side-effecting tools:

- require idempotency keys tied to the call/user action;
- distinguish prepare/confirm/commit;
- require explicit user confirmation for purchases, deletion, messages, or transfers;
- record outcome independently of whether the model turn was interrupted;
- never claim rollback unless the external system confirmed it.

## Timeouts, errors, and duplicates

- Put a timeout on every tool.
- Return a structured error response so the model can recover; do not leave a blocking call unanswered.
- Cache completed responses by call ID during the session to tolerate duplicate delivery/reconnect ambiguity.
- Bound concurrency and queue length.
- Redact secrets/PII from tool logs and from data returned to the model.

## Built-in Google Search

```ts
const config = {
  responseModalities: [Modality.AUDIO],
  tools: [
    { googleSearch: {} },
    { functionDeclarations: [getOrderStatusDeclaration] },
  ],
};
```

Search can be combined with custom functions. Code execution, Maps, URL context, and structured output are not supported by `gemini-3.8-live` even if other Gemini endpoints support them.

## Security checklist

- Allowlist tool names and validate arguments with a schema.
- Authenticate and authorize in trusted code; the model is not an authority.
- Separate read tools from side-effect tools.
- Require confirmation for consequential actions.
- Add per-user rate limits and audit IDs.
- Use least-privilege credentials and short timeouts.
- Treat tool output as untrusted input; avoid prompt injection from external content.
- Make writes idempotent and surface truthful failure states.

Sources: [Live tool use](https://ai.google.dev/gemini-api/docs/live-api/tools), [function calling](https://ai.google.dev/gemini-api/docs/function-calling), [WebSocket reference](https://ai.google.dev/api/live), [Gemini 3.8 model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live).
