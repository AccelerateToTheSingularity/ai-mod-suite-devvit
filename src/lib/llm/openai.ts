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
        // GPT-5.x / reasoning models reject max_tokens; use max_completion_tokens (includes reasoning tokens).
        max_completion_tokens: opts.maxOutputTokens ?? 200,
        temperature: opts.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      console.error(`[ai-mod-suite] LLM (OpenAI) error ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string | null; refusal?: string };
      }>;
      usage?: unknown;
    };
    const choice = data.choices?.[0];
    const content = choice?.message?.content?.trim() ?? '';
    if (content) return content;

    const refusal = choice?.message?.refusal?.trim();
    if (refusal) {
      console.error(`[ai-mod-suite] LLM (OpenAI) refusal: ${refusal}`);
      return null;
    }

    console.error(
      `[ai-mod-suite] LLM (OpenAI) empty message content (model=${model}, finish_reason=${choice?.finish_reason ?? 'unknown'}, usage=${JSON.stringify(data.usage)})`
    );
    return null;
  } catch (err) {
    console.error('[ai-mod-suite] LLM (OpenAI) fetch failed:', err);
    return null;
  }
}

export function defaultOpenAIModel(): string {
  return DEFAULT_OPENAI_MODEL;
}
