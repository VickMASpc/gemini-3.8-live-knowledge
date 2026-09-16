# Gemini Live Workspace

A framework-free, browser-only Gemini Live workspace. It is ready to publish as static files: no Node server, package install, environment variable, or build step is required.

## What works

- Paste your own Gemini API key in the in-app Connection settings and connect directly from the browser.
- Speak through the microphone or send a typed message during a session.
- Ask Gemini to make a note, list notes, personalize itself, or check a local time. The browser dispatches these local tools and Gemini receives their real result.
- Add, delete, and clear notes yourself. Notes and preferences persist in `localStorage` on the current browser only.
- Change model, voice, transcription, and VAD settings before connecting.
- Use the responsive static page over HTTPS (GitHub Pages supplies HTTPS) with no backend route.

## Deploy to GitHub Pages

1. Put the **contents** of `browser-demo/` in the repository folder you publish (or configure Pages to publish that folder).
2. In GitHub, enable Pages for the chosen branch/folder. No Actions build is necessary.
3. Open the deployed HTTPS URL, paste a Gemini API key that you own, and click **Start session**.

All asset URLs are relative, so the page works at `https://owner.github.io/repository-name/` as well as a custom domain. The runtime loads Google's browser SDK from `esm.sh`; the deployed device needs normal access to that host and Gemini's API.

## Key safety

GitHub Pages cannot keep a key secret. This app does not ship a key, place one in source, or send it to any server other than Gemini after you connect. By default the pasted key stays only in the active tab memory. The optional **Keep this key in this browser** setting saves it in that browser's `localStorage`, which is convenient but less safe on a shared device.

Use a key restricted to your Pages origin and only the Gemini API, set quotas, and revoke/rotate it when needed. For a multi-user production product, use an authenticated backend that issues short-lived tokens instead; static hosting cannot provide that security boundary.

## Local preview

You may open `index.html` from a local static server for development. Microphone access requires `https://` or `http://localhost`; GitHub Pages meets this requirement automatically.

## Important limits

The model name defaults to `gemini-3.8-live` to match this repository's material. If the key/project exposes a different Live model, change it in the in-app Model field before connecting. Notes and personalization are deliberately browser-local, not cloud-synced.
