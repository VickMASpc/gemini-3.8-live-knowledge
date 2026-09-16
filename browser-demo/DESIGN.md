# Design specification and fidelity record

## Concept

ImageGen built-in mode produced [`assets/design-concept.png`](assets/design-concept.png) as the implementation reference.

Prompt summary: a complete 1440×1000 high-fidelity Gemini 3.8 Live developer console with a quiet navy shell, true-white surfaces, green-teal audio accent, central waveform, session controls, settings rail, transcript, event/tool activity, Demo/Live mode, and a privacy note. All functional text and controls were required to remain code-native; no photographs, logos, gradients, fake metrics, or decorative UI filler.

## Extracted design system

- Background: cool pale gray canvas; true-white surfaces; deep navy sidebar.
- Accent: green-teal for audio/listening and primary action; blue for model output; restrained semantic red/orange.
- Typography: system sans-serif for UI; monospaced timestamps/event types.
- Containers: one main voice stage, one settings rail, two open data panels; thin cool-gray borders; medium radii; subtle elevation.
- Controls: filled primary start button, outlined mute button, red-tinted end button, native select, custom accessible switches.
- Icons: code-native inline SVG with rounded 1.8px strokes; waveform is code-native spans.
- Motion: waveform height only; reduced-motion override included.
- Responsive continuation: sidebar collapses and then becomes a compact top brand bar; settings and data rails stack.

## Primary workflow

`Disconnected → Start → Listening → demo transcript → tool running → model speaking → Listening → Mute/Unmute → End`

Live mode adds `token request → WebSocket setup → microphone capture`, with an explicit retryable error when provisioning fails.

## Above-the-fold copy lock

`Gemini Live Console`, `Live console`, `Stream audio, inspect transcripts, and trace tool activity.`, connection status, `Ready to connect`/active state, `Start session`, `Mute`/`Unmute`, `End session`, `Session settings`, `Voice`, transcription controls, `Automatic VAD`, `Mode`, `Demo`, and `Live`.

## Fidelity ledger

| Point | Concept evidence | Render evidence | Result |
|---|---|---|---|
| Shell and hierarchy | Navy sidebar; large stage; narrow settings rail | Same layout at 1440×1000 | Matched |
| Palette | True-white panels, cool canvas, teal accent | CSS tokens preserve the palette without gradients | Matched |
| Voice focal point | Large circular outlined waveform | Code-native responsive circle and seven bars | Matched |
| Controls | Start, mute, end with distinct hierarchy | Semantic buttons with disabled/pressed/focus states | Matched and made accessible |
| Data region | Transcript left; events/tool stream right | Same two-panel lower rail and monospaced events | Matched |
| Mobile | Implied vertical continuation | Verified at 390×844 with no horizontal overflow | Implemented consistently |
| Functional states | Concept shows disconnected and event examples | Demo exercises connected, listening, tool, speaking, muted, ended | Expanded as required |

Intentional differences: the implementation adds a short top-page descriptor, explicit audio-format footer, more truthful privacy copy, retryable error state, and working Demo/Live behavior. These support the requested reference/teaching purpose without changing the concept’s information architecture.
