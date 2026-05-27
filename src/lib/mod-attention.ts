import { settings } from '@devvit/web/server';
import {
  generateModAttentionSummary,
  type ModAttentionContext,
  type ModAttentionKind,
} from './ai.js';
import { BOT_COMMENT_FOOTER } from './bot-comment-format.js';

const REPORT_REASON_MAX = 95;

export interface TrollAlertMetrics {
  subredditName: string;
  username: string;
  averageScore: number;
  commentCount: number;
  totalSubActivity: number;
  milestone: string | null;
  specialist: string | null;
}

export async function resolveModAttentionSummary(
  context: ModAttentionContext
): Promise<string | undefined> {
  const enabled = (await settings.get<boolean>('mod_attention_summaries_enabled')) ?? false;
  if (!enabled) return undefined;

  const summary = await generateModAttentionSummary(context);
  if (!summary) return undefined;
  return summary.trim() || undefined;
}

export function buildReportReason(reason: string, summary?: string): string {
  const prefix = 'AI Moderation: ';
  const maxBody = REPORT_REASON_MAX - prefix.length;
  if (maxBody <= 0) return prefix.slice(0, REPORT_REASON_MAX);

  let body = reason;
  if (summary) {
    const firstSentence = summary.split(/[.!?]\s/)[0]?.trim() || summary;
    body = firstSentence.length <= maxBody ? firstSentence : summary;
  }
  const truncated = body.slice(0, maxBody).trim();
  return `${prefix}${truncated}`;
}

export function buildViolationModmailBody(params: {
  author: string;
  isPost: boolean;
  reason: string;
  summary?: string;
  link: string;
}): string {
  const { author, isPost, reason, summary, link } = params;
  const lines = [
    '**AI Mod Suite — Moderation Alert**',
    '',
    `**Type:** ${isPost ? 'Post' : 'Comment'} by u/${author}`,
  ];
  if (summary) {
    lines.push('', '**AI review summary:**', summary);
  }
  lines.push('', '**Rule match reason:**', reason, '', `**Link:** ${link}`);
  return lines.join('\n');
}

export function buildRemovalModmailBody(params: {
  author: string;
  isPost: boolean;
  reason: string;
  summary?: string;
  link: string;
}): string {
  const { author, isPost, reason, summary, link } = params;
  const lines = [
    '**AI Mod Suite — Content Removed**',
    '',
    `**Type:** ${isPost ? 'Post' : 'Comment'} by u/${author}`,
    '**Action:** Content was removed by AI moderation.',
  ];
  if (summary) {
    lines.push('', '**AI review summary:**', summary);
  }
  lines.push('', '**Rule match reason:**', reason, '', `**Link:** ${link}`);
  return lines.join('\n');
}

export function buildRemovalPublicReply(params: {
  isPost: boolean;
  reason: string;
  summary?: string;
}): string {
  const { isPost, reason, summary } = params;
  const contentType = isPost ? 'post' : 'comment';
  let body = `🤖 **AI Mod Suite — Content Removed**\n\nYour ${contentType} was removed because it violates community guidelines.\n\n**Reason:** ${reason}`;
  if (summary) {
    body += `\n\n**Details:** ${summary}`;
  }
  body += `\n\n---\n${BOT_COMMENT_FOOTER}`;
  return body;
}

export function buildTrollModmailBody(metrics: TrollAlertMetrics, summary?: string): string {
  const lines = [
    `User u/${metrics.username} has triggered a Troll Alert in r/${metrics.subredditName}.`,
    '',
    '**Metrics:**',
    `- Average Comment Score: ${metrics.averageScore.toFixed(2)}`,
    `- Comment Count: ${metrics.commentCount}`,
    `- Total Activity Count: ${metrics.totalSubActivity}`,
    `- Calculated Milestone: ${metrics.milestone || 'None'}`,
    `- Calculated Specialist: ${metrics.specialist || 'None'}`,
  ];
  if (summary) {
    lines.push('', '**AI review summary:**', summary);
  }
  lines.push('', 'Please review this user\'s local comments to verify if they are a bad actor.');
  return lines.join('\n');
}

export function buildAuditMessage(params: {
  action: string;
  reason: string;
  summary?: string;
  extra?: string;
}): string {
  const parts: string[] = [];
  if (params.extra) parts.push(params.extra);
  parts.push(`Reason: ${params.reason}`);
  if (params.summary) {
    parts.push(`AI review summary: ${params.summary}`);
  }
  return parts.join(' ');
}

export type { ModAttentionKind, ModAttentionContext };
