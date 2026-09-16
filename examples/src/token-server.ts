import { GoogleGenAI, Modality } from '@google/genai';

/** Call only after authenticating and authorizing the requesting user. */
export async function mintLiveToken(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Server is missing GEMINI_API_KEY');

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

  if (!token.name) throw new Error('Token service returned no token name');
  return token.name;
}
