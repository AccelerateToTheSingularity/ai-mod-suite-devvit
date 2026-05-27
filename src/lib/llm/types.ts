export type LlmProvider = 'gemini' | 'openai';

export interface CompleteTextOptions {
  maxOutputTokens?: number;
  temperature?: number;
  /** Gemini 3.x only: minimal | low | medium | high. Default medium (see GEMINI_DEFAULT_THINKING_LEVEL). */
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}
