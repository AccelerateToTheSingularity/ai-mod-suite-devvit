import { settings } from '@devvit/web/server';
import {
  LLM_MAX_OUTPUT_LONG,
  LLM_MAX_OUTPUT_MEDIUM,
  LLM_MAX_OUTPUT_SHORT,
} from './constants.js';
import { completeText } from './llm/index.js';

export async function generateTldr(text: string, customPrompt?: string): Promise<string | null> {
  const defaultPrompt = `You are a helpful assistant for a Reddit moderation bot. \nRead the following Reddit post and write a concise TLDR in 2-3 sentences. \nBe neutral, factual and friendly. Start with "TLDR:".`;
  const activePrompt = customPrompt || (await settings.get<string>('tldr_prompt')) || defaultPrompt;
  const prompt = `${activePrompt}\n\nPost:\n${text.slice(0, 4000)}`;
  return completeText(prompt, { maxOutputTokens: LLM_MAX_OUTPUT_LONG, temperature: 0.3 });
}

export async function generateSummonReply(commentBody: string): Promise<string | null> {
  const customPrompt =
    (await settings.get<string>('summon_prompt')) ??
    `You are "AI Mod Suite", a helpful AI assistant for a Reddit community focused on AI and technology.\nA user has summoned you directly (for example with "hey bot", "mod bot", or "!bot"). Reply helpfully and concisely to what they wrote.\nKeep it under 3 sentences. Be positive and informative. Be especially welcoming — they reached out for your perspective.`;

  const prompt = `${customPrompt}\n\nTheir message:\n${commentBody.slice(0, 2000)}`;
  return completeText(prompt, { maxOutputTokens: LLM_MAX_OUTPUT_MEDIUM, temperature: 0.7 });
}

export async function evaluateContentForViolation(
  text: string,
  rulesPrompt: string
): Promise<{ violates: boolean; reason: string } | null> {
  const prompt = `You are an expert AI moderator for a Reddit community. Evaluate the following post/comment content against the custom guidelines.

CUSTOM GUIDELINES:
${rulesPrompt}

CONTENT TO EVALUATE:
"${text.slice(0, 4000)}"

Evaluate strictly. Your response must follow this exact format:
VIOLATES: [YES/NO]
REASON: [Short explanation of why it violates. Only include this line if VIOLATES is YES]

Response:`;

  const responseText = await completeText(prompt, {
    maxOutputTokens: LLM_MAX_OUTPUT_SHORT,
    temperature: 0.1,
  });
  if (responseText === null) return null;

  console.log(`[ai-mod-suite] AI Moderation response: "${responseText.trim()}"`);

  const violatesMatch = responseText.match(/VIOLATES:\s*(YES|NO)/i);
  const reasonMatch = responseText.match(/REASON:\s*(.*)/is);

  const violates = violatesMatch ? violatesMatch[1].toUpperCase() === 'YES' : false;
  const reason = violates ? (reasonMatch ? reasonMatch[1].trim() : 'No explanation provided.') : '';

  return { violates, reason };
}

export async function generateCommentSummary(
  commentsText: string,
  customPrompt?: string
): Promise<string | null> {
  const defaultPrompt = `Synthesize the main viewpoints, key insights, and notable debates from the comments. Target around 100 words. Focus on substance, capture diverse perspectives, and highlight consensus/disagreements. Output only the summary.`;
  const prompt = `${customPrompt || defaultPrompt}\n\nComments to summarize:\n${commentsText.slice(0, 8000)}`;
  return completeText(prompt, { maxOutputTokens: LLM_MAX_OUTPUT_LONG, temperature: 0.3 });
}

export async function generateConversationalReply(
  commentBody: string,
  contextChain: string,
  customPrompt?: string
): Promise<string | null> {
  const defaultPrompt = `You are a friendly member of this community. A user has replied to one of your comments. Respond to them in a casual, conversational, human-like manner. Keep it brief (1-3 sentences).`;
  const prompt = `${customPrompt || defaultPrompt}\n\nContext chain:\n${contextChain}\n\nTarget comment to reply to:\n${commentBody}`;
  return completeText(prompt, { maxOutputTokens: LLM_MAX_OUTPUT_MEDIUM, temperature: 0.7 });
}

export type ModAttentionKind = 'violation' | 'troll_alert' | 'removal';

export interface ModAttentionContext {
  kind: ModAttentionKind;
  subredditName?: string;
  username: string;
  contentExcerpt?: string;
  ruleReason?: string;
  metrics?: {
    averageScore: number;
    commentCount: number;
    totalSubActivity: number;
    milestone?: string | null;
    specialist?: string | null;
  };
  sampleComments?: string[];
}

const DEFAULT_MOD_ATTENTION_PROMPT =
  'Write a brief, neutral summary for subreddit moderators: what happened, why it may need attention, and what to verify. Use plain sentences only (no bullet lists or tables). Stay factual; do not invent facts beyond the provided context.';

function buildModAttentionPrompt(context: ModAttentionContext, customPrompt: string): string {
  const lines: string[] = [customPrompt, '', `Alert type: ${context.kind}`, `User: u/${context.username}`];

  if (context.subredditName) {
    lines.push(`Subreddit: r/${context.subredditName}`);
  }

  if (context.ruleReason) {
    lines.push('', 'Rule evaluation reason:', context.ruleReason);
  }

  if (context.contentExcerpt) {
    lines.push('', 'Content excerpt:', context.contentExcerpt.slice(0, 800));
  }

  if (context.metrics) {
    const m = context.metrics;
    lines.push(
      '',
      'Participation metrics:',
      `- Average comment score: ${m.averageScore.toFixed(2)}`,
      `- Local comment count: ${m.commentCount}`,
      `- Total local activity: ${m.totalSubActivity}`,
      `- Milestone flair tier: ${m.milestone ?? 'None'}`,
      `- Specialist role: ${m.specialist ?? 'None'}`
    );
  }

  if (context.sampleComments && context.sampleComments.length > 0) {
    lines.push('', 'Sample of recent local comments (lowest scores first):');
    for (const c of context.sampleComments.slice(0, 8)) {
      lines.push(`---\n${c.slice(0, 500)}`);
    }
  }

  if (context.kind === 'removal') {
    lines.push(
      '',
      'The content has already been removed. Summarize what moderators should know for their records.'
    );
  } else if (context.kind === 'troll_alert') {
    lines.push(
      '',
      'This is a troll-review alert based on strongly negative local comment scores. Summarize patterns and what mods should check.'
    );
  } else {
    lines.push('', 'Summarize why moderators should review this flagged content.');
  }

  lines.push('', 'Output only the summary (2-4 sentences):');
  return lines.join('\n');
}

export async function generateModAttentionSummary(
  context: ModAttentionContext
): Promise<string | null> {
  const customPrompt =
    (await settings.get<string>('mod_attention_summary_prompt')) || DEFAULT_MOD_ATTENTION_PROMPT;
  const prompt = buildModAttentionPrompt(context, customPrompt);
  const raw = await completeText(prompt, { maxOutputTokens: LLM_MAX_OUTPUT_MEDIUM, temperature: 0.2 });
  if (!raw) return null;
  return raw.trim().replace(/\n{3,}/g, '\n\n') || null;
}

export async function classifySpecialistRole(
  userComments: string,
  rolesList: string,
  customPrompt?: string
): Promise<string | null> {
  const defaultPrompt = `Analyze the user's comment history below and choose the single most appropriate role that describes their engagement style/focus. Respond with ONLY the selected role name.`;
  const prompt = `${customPrompt || defaultPrompt}

Permitted Roles:
[${rolesList}]

User Comment History:
${userComments.slice(0, 8000)}

Selected Role:`;

  const rawRole = (await completeText(prompt, { maxOutputTokens: LLM_MAX_OUTPUT_SHORT, temperature: 0 }))?.trim();
  if (!rawRole) return null;

  const roles = rolesList
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const r of roles) {
    if (rawRole.toLowerCase().includes(r.toLowerCase())) {
      return r;
    }
  }
  return roles[0] ?? null;
}

/** @deprecated Use generateTldr */
export const getGeminiTLDR = generateTldr;
/** @deprecated Use generateSummonReply */
export const getGeminiSummonReply = generateSummonReply;
/** @deprecated Use generateConversationalReply */
export const getGeminiConversationalReply = generateConversationalReply;
/** @deprecated Use generateCommentSummary */
export const getGeminiCommentSummary = generateCommentSummary;
/** @deprecated Use classifySpecialistRole */
export const getGeminiSpecialistRole = classifySpecialistRole;
