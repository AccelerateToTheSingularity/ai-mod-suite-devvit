/** Standard footer for public bot comments. */

export const BOT_COMMENT_FOOTER =
  '*^(AI assistant · mention the bot, mod bot, or use !bot)*';

const CURRENT_FOOTER_REGEX =
  /\*+\^?\(AI assistant · mention the bot, mod bot, or use !bot\)\*+/i;

/** Append the standard footer once (idempotent if already present). */
export function formatBotPublicComment(body: string): string {
  const trimmed = body.trimEnd();
  if (CURRENT_FOOTER_REGEX.test(trimmed)) {
    const footerStart = trimmed.search(CURRENT_FOOTER_REGEX);
    const beforeFooter = trimmed.slice(0, footerStart).replace(/\n*---\s*$/g, '').trimEnd();
    return `${beforeFooter}\n\n---\n${BOT_COMMENT_FOOTER}`;
  }
  return `${trimmed}\n\n---\n${BOT_COMMENT_FOOTER}`;
}
