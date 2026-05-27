export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
/** Default when OpenAI is selected and no preset/custom model is set. */
export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

/** Select value for custom model ID entry on Install Settings. */
export const LLM_MODEL_CUSTOM = '__custom__';

/**
 * Curated Gemini text models for generateContent (generativelanguage.googleapis.com).
 * Gemini 3 generation per https://ai.google.dev/gemini-api/docs/deprecations (May 2026).
 * Omits 2.5/2.0 (successor: 3.x), image/audio/live/TTS, and preview models with near-term shutdown.
 */
export const ALLOWED_GEMINI_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
] as const;

/**
 * Curated OpenAI chat models (v1/chat/completions).
 * GPT-5.4/5.5 generation per https://developers.openai.com/api/docs/models (May 2026).
 */
export const ALLOWED_OPENAI_MODELS = [
  'gpt-5.5',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
] as const;

export const ALLOWED_LLM_MODEL_IDS: readonly string[] = [
  ...ALLOWED_GEMINI_MODELS,
  ...ALLOWED_OPENAI_MODELS,
];

/** @deprecated Use DEFAULT_GEMINI_MODEL */
export const GEMINI_MODEL = DEFAULT_GEMINI_MODEL;

/** Gemini 3.x thinking level when not overridden per call. */
export const GEMINI_DEFAULT_THINKING_LEVEL = 'medium' as const;

/**
 * Default maxOutputTokens for Gemini generateContent.
 * Must be large enough for medium thinking + visible answer (2–3 sentence TLDR is tiny;
 * thinking can use hundreds–thousands of tokens before the model writes the reply).
 */
export const GEMINI_DEFAULT_MAX_OUTPUT_TOKENS = 4096;

/** TLDRs, discussion summaries, moderation with context. */
export const LLM_MAX_OUTPUT_LONG = 4096;

/** Summons, conversational replies, mod-alert summaries. */
export const LLM_MAX_OUTPUT_MEDIUM = 2048;

/** Structured short outputs (violation yes/no, flair role name). */
export const LLM_MAX_OUTPUT_SHORT = 1024;
