import { ALLOWED_LLM_MODEL_IDS } from './constants.js';

function isAllowedCustomModelId(modelId: string): boolean {
  const id = modelId.trim();
  if (!id || id.length > 128) return false;
  if (ALLOWED_LLM_MODEL_IDS.includes(id)) return true;
  if (/^gemini-[\d.]+[\w.-]*$/i.test(id)) return true;
  if (/^gpt-[\d.]+[\w.-]*$/i.test(id)) return true;
  return false;
}

export type SettingsValidationResult = { success: true } | { success: false; error: string };

export function validateLlmApiKeyValue(value: unknown): SettingsValidationResult {
  const key = String(value ?? '').trim();
  if (!key) {
    return { success: true };
  }
  if (key.length < 8) {
    return { success: false, error: 'API key looks too short. Check the key from your provider.' };
  }
  if (key.length > 512) {
    return { success: false, error: 'API key looks too long.' };
  }
  return { success: true };
}

export function validateLlmModelCustomValue(value: unknown): SettingsValidationResult {
  const modelId = String(value ?? '').trim();
  if (!modelId) {
    return { success: true };
  }
  if (!isAllowedCustomModelId(modelId)) {
    return {
      success: false,
      error:
        'Use a supported Gemini (gemini-…) or OpenAI (gpt-…) model ID, or pick a preset from the Model dropdown.',
    };
  }
  return { success: true };
}
