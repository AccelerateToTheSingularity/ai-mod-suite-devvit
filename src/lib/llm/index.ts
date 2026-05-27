import { settings } from '@devvit/web/server';
import {
  ALLOWED_LLM_MODEL_IDS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_MODEL,
  LLM_MODEL_CUSTOM,
} from '../constants.js';
import { completeTextGemini } from './gemini.js';
import { completeTextOpenAI } from './openai.js';
import type { CompleteTextOptions, LlmProvider } from './types.js';

function normalizeProvider(value: unknown): LlmProvider {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'openai') return 'openai';
  return 'gemini';
}

function normalizeSelectValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return String(value[0] ?? '').trim();
  return String(value).trim();
}

/** Resolve model ID: preset → custom text → provider default. */
export function resolveEffectiveModelId(
  provider: LlmProvider,
  modelSelect: string,
  modelCustom: string
): string {
  const preset = modelSelect.trim();
  const custom = modelCustom.trim();

  if (preset && preset !== LLM_MODEL_CUSTOM) {
    return preset;
  }
  if (custom) {
    return custom;
  }
  return provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_GEMINI_MODEL;
}

export function isAllowedCustomModelId(modelId: string): boolean {
  const id = modelId.trim();
  if (!id || id.length > 128) return false;
  if (ALLOWED_LLM_MODEL_IDS.includes(id)) return true;
  if (/^gemini-[\w.-]+$/i.test(id)) return true;
  if (/^gpt-[\w.-]+$/i.test(id)) return true;
  return false;
}

export async function resolveLlmConfig(): Promise<{
  provider: LlmProvider;
  apiKey: string;
  model: string;
} | null> {
  const provider = normalizeProvider(await settings.get('llm_provider'));
  const apiKey = (await settings.get<string>('llm_api_key'))?.trim() ?? '';

  if (!apiKey) {
    return null;
  }

  const modelSelect = normalizeSelectValue(await settings.get('llm_model'));
  const modelCustom = (await settings.get<string>('llm_model_custom'))?.trim() ?? '';
  const model = resolveEffectiveModelId(provider, modelSelect, modelCustom);

  return { provider, apiKey, model };
}

export async function resolveLlmConfigOrLog(feature: string): Promise<{
  provider: LlmProvider;
  apiKey: string;
  model: string;
} | null> {
  const config = await resolveLlmConfig();
  if (!config) {
    console.error(
      `[ai-mod-suite] LLM skipped (${feature}): no API key. Set LLM | API Key in Install Settings when AI features are enabled.`
    );
  }
  return config;
}

export async function completeText(
  prompt: string,
  opts: CompleteTextOptions = {}
): Promise<string | null> {
  const config = await resolveLlmConfig();
  if (!config) return null;

  const { provider, apiKey, model } = config;

  if (provider === 'openai') {
    return completeTextOpenAI(apiKey, model, prompt, opts);
  }
  return completeTextGemini(apiKey, model, prompt, opts);
}
