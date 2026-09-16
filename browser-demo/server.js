import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Modality } from '@google/genai';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number.parseInt(process.env.PORT ?? '4173', 10);
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.md', 'text/markdown; charset=utf-8'],
]);

function securityHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(self)',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://esm.sh",
      "style-src 'self'",
      "img-src 'self' data:",
      "connect-src 'self' https://esm.sh https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
  };
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    ...securityHeaders('application/json; charset=utf-8'),
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function mintToken(response) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: 'Live mode is unavailable: set GEMINI_API_KEY on the server. Demo mode still works.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
        liveConnectConstraints: {
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            sessionResumption: {},
          },
        },
      },
    });
    if (!token.name) throw new Error('Gemini returned an empty token');
    sendJson(response, 200, { token: token.name });
  } catch (error) {
    console.error('Token minting failed:', error instanceof Error ? error.message : error);
    sendJson(response, 502, { error: 'Unable to mint an ephemeral Live API token.' });
  }
}

async function serveStatic(request, response) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const knowledgeAliases = new Map([
    ['/knowledge/README.md', resolve(root, '../README.md')],
    ['/knowledge/examples/README.md', resolve(root, '../examples/README.md')],
  ]);
  const aliasedPath = knowledgeAliases.get(url.pathname);
  if (aliasedPath) {
    try {
      const body = await readFile(aliasedPath);
      response.writeHead(200, {
        ...securityHeaders('text/markdown; charset=utf-8'),
        'Cache-Control': 'no-cache',
      });
      response.end(body);
    } catch {
      sendJson(response, 404, { error: 'Not found' });
    }
    return;
  }
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const decoded = decodeURIComponent(requested);
  const filePath = resolve(root, `.${decoded}`);
  if (!filePath.startsWith(resolve(root))) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }

  try {
    const body = await readFile(filePath);
    const contentType = mimeTypes.get(extname(filePath)) ?? 'application/octet-stream';
    response.writeHead(200, {
      ...securityHeaders(contentType),
      'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    response.end(body);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: 'Server error' });
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/live-token') {
    await mintToken(response);
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }
  await serveStatic(request, response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Gemini Live browser demo: http://127.0.0.1:${port}`);
});
