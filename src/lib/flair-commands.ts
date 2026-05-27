export type FlairCommandAction = 'on' | 'off' | 'check' | 'refresh';

/** Strip Reddit inline-code backticks so `!flair on` still matches. */
export function normalizeFlairCommandBody(body: string): string {
  let t = body.trim();
  if (t.startsWith('`') && t.endsWith('`') && t.length >= 2) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Parse subcommand after !flair (tolerates trailing ! or punctuation). */
export function parseFlairSubCommand(subCommand: string): FlairCommandAction {
  const normalized = subCommand.trim().replace(/^!+/, '').replace(/[!?.]+$/g, '').trim();
  if (/^(on|enable)\b/i.test(normalized)) return 'on';
  if (/^(off|disable)\b/i.test(normalized)) return 'off';
  if (/^(refresh|update|rescan)\b/i.test(normalized)) return 'refresh';
  return 'check';
}

export function matchFlairCommand(
  body: string,
  command: string,
  options?: { parentIsAppComment?: boolean }
): { matched: boolean; subCommand: string } {
  const normalizedBody = normalizeFlairCommandBody(body);
  const bodyLower = normalizedBody.toLowerCase().trim();
  const commandLower = command.toLowerCase().trim();
  if (!commandLower) return { matched: false, subCommand: '' };

  // !flair, !flair!, !flair on, !flair on!
  if (bodyLower.startsWith(commandLower)) {
    const rest = bodyLower.substring(commandLower.length).trim();
    return { matched: true, subCommand: rest };
  }

  // Reply "on" / "on !" under bot after "reply !flair on"
  if (
    options?.parentIsAppComment &&
    /^(on|off|enable|disable)(?:\s*!)?\s*$/i.test(bodyLower)
  ) {
    return { matched: true, subCommand: bodyLower };
  }

  return { matched: false, subCommand: '' };
}

/** Reddit user flair text limit (selectflair API). */
export function truncateFlairText(text: string, maxLen = 64): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}
