/**
 * Direct-address summon detection for AI Mod Suite.
 * Triggers when someone is talking TO the bot — not third-person "ask the bot".
 */

const BOT_TERM =
  '(?:bot|the\\s+bot|mod\\s*bot|ai\\s*bot|tldr\\s*bot|reddit\\s*bot|ai\\s*mod\\s*suite)';

const GREETINGS =
  '(?:hey|hi|hello|yo|sup|hiya|howdy|greetings|good\\s+(?:morning|afternoon|evening))';

const SUMMON_PATTERNS: RegExp[] = [
  // Explicit commands
  /\B!bot\b/i,
  /\B!summon\b/i,
  /\B!askbot\b/i,

  // Greeting + bot term (optional "there" or short filler e.g. "hi you bot")
  new RegExp(`\\b${GREETINGS}(?:\\s+there)?(?:\\s+\\w+){0,3}\\s+${BOT_TERM}\\b`, 'i'),

  // "summon(s) ai mod suite" / "summoning the ai mod suite"
  /\bsummons?\s+(?:the\s+)?ai\s*mod\s*suite\b/i,

  // Greeting + punctuation + content (hey bot — ...)
  new RegExp(`\\b${GREETINGS}\\s+${BOT_TERM}\\s*[-—]`, 'i'),

  // Vocative at line start: bot, ... / mod bot: ...
  new RegExp(`^\\s*${BOT_TERM}\\s*[,!:—-]`, 'im'),

  // Informal @ mentions
  /\B@(?:mod\s*)?bot\b/i,

  // Standalone intentional address (not bare product name in titles — use greeting or summon verb)
  /\bmod\s*bot\b/i,
  /\bai\s*bot\b/i,

  // Paging / calling (with or without "I")
  /\b(?:paging|calling)\s+(?:the\s+)?(?:mod\s+)?bot\b/i,
  /\bsummon(?:ing)?\s+(?:the\s+)?(?:mod\s+)?bot\b/i,
  /\bI(?:'m| am)?\s*(?:summon(?:ing)?|calling|paging)\s+(?:the\s+)?(?:mod\s+)?bot\b/i,
  /\bI(?:'m| am)?\s*(?:summon(?:ing)?|calling|paging)\s+(?:the\s+)?ai\s+bot\b/i,

  // Question for the bot
  /\bquestion\s+for\s+(?:the\s+)?(?:mod\s+)?bot\b/i,

  // Reddit username mentions (app install accounts)
  /\bu\/ai-mod-suite-bot\b/i,
  /\bu\/OptimistPrime_AI_Bot\b/i,
];

/** Hostile / bad-faith summons — skip replying */
const HOSTILE_PATTERNS: RegExp[] = [
  /\b(?:stupid|dumb|useless|trash|garbage)\s+(?:bot|ai)\b/i,
  /\bfuck\s*(?:off|you|this)\b/i,
  /\bshut\s*(?:up|the\s*fuck)\b/i,
  /\bkill\s+yourself\b/i,
  /\bgo\s+away\b/i,
  /\bnobody\s+(?:asked|cares)\b/i,
];

const BOT_USERNAME_PATTERNS: RegExp[] = [
  /\bbot\b/i,
  /auto[\-_]?mod/i,
  /AutoModerator/i,
];

export function isSummon(text: string): boolean {
  if (!text?.trim()) return false;
  return SUMMON_PATTERNS.some((p) => p.test(text));
}

export function isHostileSummon(text: string): boolean {
  if (!text?.trim()) return false;
  return HOSTILE_PATTERNS.some((p) => p.test(text));
}

export function isLikelyBotUsername(authorName: string | undefined | null): boolean {
  if (!authorName) return true;
  return BOT_USERNAME_PATTERNS.some((p) => p.test(authorName));
}
