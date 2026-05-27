import { DEFAULT_OPENAI_MODEL } from '../constants.js';
import type { CompleteTextOptions } from './types.js';

export async function completeTextOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  opts: CompleteTextOptions = {}
): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: opts.maxOutputTokens ?? 200,
        temperature: opts.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      console.error(`[ai-mod-suite] LLM (OpenAI) error ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[ai-mod-suite] LLM (OpenAI) fetch failed:', err);
    return null;
  }
}

export function defaultOpenAIModel(): string {
  return DEFAULT_OPENAI_MODEL;
}
