import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_DEFAULT_MAX_OUTPUT_TOKENS,
  GEMINI_DEFAULT_THINKING_LEVEL,
} from '../constants.js';
import type { CompleteTextOptions } from './types.js';

type GeminiPart = { text?: string; thought?: boolean };

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  usageMetadata?: {
    thoughtsTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

/** Gemini 3.x uses internal thinking; API default for flash is medium. */
function isGemini3Model(model: string): boolean {
  return /gemini-3/i.test(model);
}

/** Join visible answer text; skip thought-summary parts when present. */
export function extractGeminiAnswerText(data: GeminiGenerateResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const visible = parts
    .filter((p) => typeof p.text === 'string' && p.text.length > 0 && p.thought !== true)
    .map((p) => p.text as string);
  if (visible.length > 0) {
    return visible.join('');
  }
  const first = parts.find((p) => typeof p.text === 'string' && p.text.length > 0);
  return first?.text ?? '';
}

function buildGenerationConfig(model: string, opts: CompleteTextOptions): Record<string, unknown> {
  const config: Record<string, unknown> = {
    maxOutputTokens: opts.maxOutputTokens ?? GEMINI_DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: opts.temperature ?? 0.3,
  };
  if (isGemini3Model(model)) {
    config.thinkingConfig = {
      thinkingLevel: opts.thinkingLevel ?? GEMINI_DEFAULT_THINKING_LEVEL,
    };
  }
  return config;
}

export async function completeTextGemini(
  apiKey: string,
  model: string,
  prompt: string,
  opts: CompleteTextOptions = {}
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: buildGenerationConfig(model, opts),
      }),
    });

    if (!res.ok) {
      console.error(`[ai-mod-suite] LLM (Gemini) error ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as GeminiGenerateResponse;
    const text = extractGeminiAnswerText(data).trim();
    const finishReason = data.candidates?.[0]?.finishReason;
    const usage = data.usageMetadata;

    if (!text) {
      console.error(
        `[ai-mod-suite] LLM (Gemini) empty answer model=${model} finish=${finishReason ?? 'unknown'} ` +
          `thoughtTokens=${usage?.thoughtsTokenCount ?? '?'} candidateTokens=${usage?.candidatesTokenCount ?? '?'}`
      );
      return null;
    }

    if (
      finishReason === 'MAX_TOKENS' ||
      (text.length < 24 && (usage?.candidatesTokenCount ?? 0) < 30)
    ) {
      console.warn(
        `[ai-mod-suite] LLM (Gemini) possibly truncated model=${model} len=${text.length} ` +
          `finish=${finishReason} thoughtTokens=${usage?.thoughtsTokenCount ?? '?'} ` +
          `candidateTokens=${usage?.candidatesTokenCount ?? '?'} preview="${text.slice(0, 80)}"`
      );
    }

    return text;
  } catch (err) {
    console.error('[ai-mod-suite] LLM (Gemini) fetch failed:', err);
    return null;
  }
}

export function defaultGeminiModel(): string {
  return DEFAULT_GEMINI_MODEL;
}
