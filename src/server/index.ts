import { Hono } from 'hono';
import { createServer, getServerPort, reddit, redis, settings } from '@devvit/web/server';
import type { TriggerResponse } from '@devvit/web/shared';
import {
  matchFlairCommand,
  parseFlairSubCommand,
  truncateFlairText,
} from '../lib/flair-commands.js';
import { resolveCommentAuthorName } from '../lib/reddit-author.js';
import { isAppAuthored, isAppAuthoredComment } from '../lib/safety.js';
import {
  generateTldr,
  generateSummonReply,
  evaluateContentForViolation,
  generateCommentSummary,
  generateConversationalReply,
  classifySpecialistRole,
} from '../lib/ai.js';
import { logAuditEvent } from '../lib/audit-log.js';
import {
  resolveModAttentionSummary,
  buildReportReason,
  buildViolationModmailBody,
  buildRemovalModmailBody,
  buildRemovalPublicReply,
  buildTrollModmailBody,
  buildAuditMessage,
  type TrollAlertMetrics,
} from '../lib/mod-attention.js';
import { isSummon, isHostileSummon, isLikelyBotUsername } from '../lib/summons.js';
import {
  countWords,
  readCrosspostParentId,
  resolveRedditReferenceContent,
} from '../lib/reddit-reference-content.js';
import {
  validateLlmApiKeyValue,
  validateLlmModelCustomValue,
} from '../lib/settings-validation.js';
import { formatBotPublicComment } from '../lib/bot-comment-format.js';

const app = new Hono();

// --- Idempotency ---
async function hasProcessed(id: string): Promise<boolean> {
  const key = `idemp:${id}`;
  const existing = await redis.get(key);
  if (existing) return true;
  await redis.set(key, '1');
  await redis.expire(key, 86400);
  return false;
}

// Helper to normalize settings select values which may be returned as array from Devvit SDK
function getSingleSettingValue<T extends string>(value: any, defaultValue: T): T {
  if (!value) return defaultValue;
  if (Array.isArray(value)) {
    return (value[0] ?? defaultValue) as T;
  }
  return value as T;
}

function settingsFlag(value: unknown): boolean {
  if (value === true || value === 'true') return true;
  if (Array.isArray(value)) return settingsFlag(value[0]);
  return false;
}

function settingsNumber(value: unknown, defaultValue: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

/** TLDR summaries always deliver as a public comment when not in safe mode. */
const TLDR_DELIVERY_MODE = 'comment' as const;

function shouldPinTopLevelBotComment(postTldrPin: boolean, commentSummaryPin: boolean): boolean {
  return postTldrPin || commentSummaryPin;
}

async function submitPostTopLevelBotComment(params: {
  postId: string;
  authorName: string;
  textSnippet: string;
  commentText: string;
  safeMode: boolean;
  shouldPin: boolean;
  auditLabel: string;
}): Promise<void> {
  const { postId, authorName, textSnippet, commentText, safeMode, shouldPin, auditLabel } = params;

  if (safeMode) {
    console.log(
      `[SAFE MODE] Would post ${auditLabel} on ${postId}. Pin: ${shouldPin}. Snippet: "${commentText.slice(0, 50)}..."`
    );
    await logAuditEvent({
      id: postId + '_safe_tldr',
      eventType: 'post-submit',
      targetId: postId,
      author: authorName,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: `safe-mode (comment${shouldPin ? ', pin' : ''})`,
      safeMode: true,
      success: true,
      message: `Would post ${auditLabel}${shouldPin ? ' (pinned)' : ''}: ${commentText.slice(0, 100)}...`,
    });
    return;
  }

  try {
    const comment = await reddit.submitComment({
      id: postId as any,
      text: commentText,
      runAs: 'APP',
    });
    if (shouldPin) {
      await comment.distinguish(true);
    }
    console.log(`[ai-mod-suite] Posted ${auditLabel} on ${postId}. Pinned: ${shouldPin}`);
    await logAuditEvent({
      id: postId + '_tldr',
      eventType: 'post-submit',
      targetId: postId,
      author: authorName,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: shouldPin ? 'comment (pinned)' : 'comment',
      safeMode: false,
      success: true,
      message: `Posted ${auditLabel}${shouldPin ? ' (pinned)' : ''} successfully`,
    });
  } catch (err: any) {
    console.error(`[ai-mod-suite] Failed to post ${auditLabel} on ${postId}:`, err);
    await logAuditEvent({
      id: postId + '_tldr_err',
      eventType: 'post-submit',
      targetId: postId,
      author: authorName,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: 'comment',
      safeMode: false,
      success: false,
      message: `Error posting ${auditLabel}: ${err.message ?? err}`,
    });
  }
}

/** Trigger payloads may omit or truncate body; prefer Reddit API fetch. */
function resolveCommentBody(comment: { body?: string } | null, eventBody: string): string {
  const fromApi = comment?.body?.trim();
  if (fromApi) return fromApi;
  return eventBody.trim();
}

function normalizePostThingId(postId: string): string {
  const trimmed = postId.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('t3_') ? trimmed : `t3_${trimmed}`;
}

function isTopLevelCommentOnPost(comment: { parentId?: string }, postId: string): boolean {
  if (!comment.parentId || !postId) return false;
  const normalizedPost = normalizePostThingId(postId);
  const parent = comment.parentId.trim();
  return (
    parent === normalizedPost ||
    parent === postId ||
    parent.replace(/^t3_/, '') === postId.replace(/^t3_/, '')
  );
}

const DISCUSSION_SUMMARY_SECTION_REGEX =
  /(?:###\s*)?\*\*(?:AI Mod Suite — )?Discussion Summary[\s\S]*?(?=\n\n(?:###\s*)?\*\*(?:AI Mod Suite — )?Discussion Summary|\n\n---\n\*|$)/;

function replaceDiscussionSummarySection(existingBody: string, formattedSummary: string): string {
  const trimmedSummary = formattedSummary.trim();
  let result: string;
  if (existingBody.includes('Discussion Summary')) {
    const replaced = existingBody.replace(DISCUSSION_SUMMARY_SECTION_REGEX, trimmedSummary);
    if (replaced !== existingBody) {
      result = replaced;
    } else {
      const footerIndex = existingBody.indexOf('\n\n---');
      if (footerIndex !== -1) {
        result =
          existingBody.slice(0, footerIndex) + '\n\n' + trimmedSummary + existingBody.slice(footerIndex);
      } else {
        result = existingBody + '\n\n' + trimmedSummary;
      }
    }
  } else {
    const footerIndex = existingBody.indexOf('\n\n---');
    if (footerIndex !== -1) {
      result =
        existingBody.slice(0, footerIndex) + '\n\n' + trimmedSummary + existingBody.slice(footerIndex);
    } else {
      result = existingBody + '\n\n' + trimmedSummary;
    }
  }
  return result;
}

/** Run on every comment-submit (after idempotency) so early returns do not skip milestone updates. */
async function maybeUpdateDiscussionSummary(postId: string, safeMode: boolean): Promise<void> {
  if (!postId) return;

  const commentSummaryEnabled = settingsFlag(await settings.get('comment_summary_enabled'));
  if (!commentSummaryEnabled) return;

  const milestonesStr = (await settings.get<string>('comment_summary_milestones')) ?? '20, 50, 100';
  const milestones = milestonesStr
    .split(',')
    .map((m) => parseInt(m.trim(), 10))
    .filter((m) => Number.isFinite(m) && m > 0)
    .sort((a, b) => a - b);
  if (milestones.length === 0) return;

  const postTldrPin = settingsFlag(await settings.get('post_tldr_pin'));
  const commentSummaryPin = settingsFlag(await settings.get('comment_summary_pin'));
  const pinTopLevelBotComment = shouldPinTopLevelBotComment(postTldrPin, commentSummaryPin);

  let post: any = null;
  try {
    post = await reddit.getPostById(postId as any);
  } catch (err) {
    console.error(`[ai-mod-suite] Error getting post for summary check:`, err);
    return;
  }

  const currentCommentsCount = post.numberOfComments ?? 0;
  const newlyReached: number[] = [];
  for (const milestone of milestones) {
    const milestoneKey = `summary_milestone:${postId}:${milestone}`;
    const alreadySummarized = await redis.get(milestoneKey);
    if (currentCommentsCount >= milestone && !alreadySummarized) {
      newlyReached.push(milestone);
    }
  }

  if (newlyReached.length === 0) {
    return;
  }

  const milestone = Math.max(...newlyReached);
  console.log(
    `[ai-mod-suite] Comments milestone ${milestone} reached on post ${postId} (count=${currentCommentsCount}, newly=[${newlyReached.join(',')}]). Generating summary...`
  );

  let allComments: any[] = [];
  try {
    allComments = await reddit.getComments({ postId: postId as any, limit: 100 }).all();
  } catch (err) {
    console.error(`[ai-mod-suite] Error fetching comments for summary:`, err);
    return;
  }

  if (allComments.length === 0) return;

  const commentsText = allComments
    .filter((c) => !isAppAuthoredComment(c))
    .map((c) => `u/${c.authorName}: ${c.body}`)
    .join('\n');
  if (!commentsText.trim()) return;

  const summaryPrompt = await settings.get<string>('comment_summary_prompt');
  const summary = await generateCommentSummary(commentsText, summaryPrompt);
  if (!summary) return;

  const botSticky = allComments.find(
    (c) => isAppAuthoredComment(c) && isTopLevelCommentOnPost(c, postId)
  );
  const formattedSummary = `**Discussion Summary (Milestone: ${milestone} comments)**\n\n${summary}\n\n`;

  if (botSticky) {
    const newBody = replaceDiscussionSummarySection(botSticky.body ?? '', formattedSummary);
    if (safeMode) {
      console.log(`[SAFE MODE] Would edit bot sticky on post ${postId} with milestone ${milestone} summary.`);
    } else {
      await botSticky.edit({ text: newBody });
      if (pinTopLevelBotComment) {
        await botSticky.distinguish(true);
      } else {
        await botSticky.undistinguish();
      }
      console.log(
        `[ai-mod-suite] Edited bot sticky on post ${postId} with milestone ${milestone} summary. Pinned: ${pinTopLevelBotComment}`
      );
    }
  } else {
    const newBody = formatBotPublicComment(formattedSummary.trim());
    if (safeMode) {
      console.log(`[SAFE MODE] Would submit new bot sticky on post ${postId} with milestone ${milestone} summary.`);
    } else {
      const newSticky = await reddit.submitComment({
        id: postId as any,
        text: newBody,
        runAs: 'APP',
      });
      if (pinTopLevelBotComment) {
        await newSticky.distinguish(true);
      }
      console.log(
        `[ai-mod-suite] Created new bot sticky on post ${postId} with milestone ${milestone} summary. Pinned: ${pinTopLevelBotComment}`
      );
    }
  }

  for (const m of newlyReached) {
    const milestoneKey = `summary_milestone:${postId}:${m}`;
    await redis.set(milestoneKey, '1');
    await redis.expire(milestoneKey, 86400 * 30);
  }
}

async function maybeHandleCommentTldr(params: {
  commentId: string;
  authorName: string;
  textBody: string;
  commentTldrEnabled: boolean;
  commentTldrWordCount: number;
  commentTldrPrompt: string;
  safeMode: boolean;
}): Promise<boolean> {
  const {
    commentId,
    authorName,
    textBody,
    commentTldrEnabled,
    commentTldrWordCount,
    commentTldrPrompt,
    safeMode,
  } = params;

  const commentWordCount = countWords(textBody);
  if (!commentTldrEnabled) {
    console.log(`[ai-mod-suite] Comment TLDR skipped on ${commentId}: feature disabled`);
    return false;
  }
  if (commentWordCount < commentTldrWordCount) {
    console.log(
      `[ai-mod-suite] Comment TLDR skipped on ${commentId}: ${commentWordCount} words (need >= ${commentTldrWordCount})`
    );
    return false;
  }

  console.log(
    `[ai-mod-suite] Long comment (${commentWordCount} words, body ${textBody.length} chars) on ${commentId}, calling LLM TLDR...`
  );

  const parentContext = await getParentChainContext(commentId, reddit);
  const tldrContext = `Parent Comment Context:\n${parentContext.slice(0, 3000)}\n\nTarget comment to summarize:\n${textBody.slice(0, 8000)}`;

  const tldr = await generateTldr(tldrContext, commentTldrPrompt);
  if (!tldr) {
    console.log(`[ai-mod-suite] Comment TLDR skipped on ${commentId}: LLM returned no text`);
    return false;
  }

  const formattedTldr = formatBotPublicComment(`**TLDR**\n\n${tldr}`);
  await handleTriageAction(
    'comment-submit',
    commentId,
    authorName,
    textBody,
    formattedTldr,
    undefined,
    safeMode,
    TLDR_DELIVERY_MODE
  );
  return true;
}

app.post('/internal/settings/validate-llm-key', async (c) => {
  const body = await c.req.json<{ value?: unknown }>();
  return c.json(validateLlmApiKeyValue(body?.value));
});

app.post('/internal/settings/validate-llm-model-custom', async (c) => {
  const body = await c.req.json<{ value?: unknown }>();
  return c.json(validateLlmModelCustomValue(body?.value));
});

// --- Parent Chain Context ---
async function getParentChainContext(commentId: string, redditClient: any): Promise<string> {
  const contextParts: string[] = [];
  let currentId = commentId;
  let depth = 0;
  
  while (depth < 6) {
    try {
      const comment = await redditClient.getCommentById(currentId as any);
      if (!comment) break;
      const chainAuthor = resolveCommentAuthorName(comment);
      contextParts.unshift(`u/${chainAuthor || 'unknown'}: ${comment.body}`);
      if (comment.parentId && comment.parentId.startsWith('t1_')) {
        currentId = comment.parentId;
        depth++;
      } else {
        // Parent is post (starts with t3_)
        try {
          const post = await redditClient.getPostById(comment.parentId as any);
          if (post) {
            contextParts.unshift(`[Post Title] ${post.title}\n[Post Content] ${post.body || ''}`);
          }
        } catch (postErr) {
          console.error(`[ai-mod-suite] Error fetching post context for ${comment.parentId}:`, postErr);
        }
        break;
      }
    } catch (err) {
      console.error(`[ai-mod-suite] Error fetching parent context for ${currentId}:`, err);
      break;
    }
  }
  return contextParts.join('\n -> ');
}

// --- Local Subreddit Activity & Stats Helpers ---
async function fetchUserLocalHistory(
  redditClient: any,
  username: string,
  subredditName: string,
  limit: number = 100
): Promise<{ comments: { body: string; score: number }[]; postsCount: number }> {
  const comments: { body: string; score: number }[] = [];
  let postsCount = 0;

  try {
    const commentsListing = redditClient.getCommentsByUser({
      username,
      limit,
      sort: 'new'
    });
    const fetchedComments = await commentsListing.all();
    for (const c of fetchedComments) {
      if (c.subredditName.toLowerCase() === subredditName.toLowerCase()) {
        comments.push({ body: c.body, score: c.score });
      }
    }
  } catch (err) {
    console.error(`[ai-mod-suite] Error fetching local comments for u/${username}:`, err);
  }

  try {
    const postsListing = redditClient.getPostsByUser({
      username,
      limit,
      sort: 'new'
    });
    const fetchedPosts = await postsListing.all();
    for (const p of fetchedPosts) {
      if (p.subredditName.toLowerCase() === subredditName.toLowerCase()) {
        postsCount++;
      }
    }
  } catch (err) {
    console.error(`[ai-mod-suite] Error fetching local posts for u/${username}:`, err);
  }

  return { comments, postsCount };
}

function calculateMilestoneTier(
  activityCount: number,
  tiersJson: string
): string | null {
  try {
    const parsed = JSON.parse(tiersJson);
    if (Array.isArray(parsed)) {
      const sortedTiers = parsed
        .map(([threshold, name]) => [Number(threshold), String(name)] as [number, string])
        .sort((a, b) => b[0] - a[0]);

      for (const [threshold, name] of sortedTiers) {
        if (activityCount >= threshold) {
          return name;
        }
      }
    }
  } catch (err) {
    console.error('[ai-mod-suite] Error parsing milestone tiers JSON:', err);
  }
  return null;
}

async function processUserFlair(
  redditClient: any,
  username: string,
  subredditName: string
): Promise<{ milestone: string | null; specialist: string | null; averageScore: number }> {
  const milestoneEnabled = await settings.get<boolean>('milestone_flair_enabled') ?? false;
  const specialistEnabled = await settings.get<boolean>('specialist_flair_enabled') ?? false;
  const milestoneTiersJson = await settings.get<string>('milestone_tiers_json') ?? '[[100, "Community Veteran"], [50, "Frequent Contributor"], [10, "Regular"], [1, "New Member"]]';
  const specialistRoles = await settings.get<string>('specialist_roles') ?? 'Helpful Contributor, Frequent Answerer, Resource Finder, Discussion Starter, Community Builder, Generalist';
  const specialistPrompt = await settings.get<string>('specialist_prompt') ?? 'Analyze the user\'s comment history below and choose the single most appropriate role that describes their engagement style/focus. Respond with ONLY the selected role name.';

  const { comments, postsCount } = await fetchUserLocalHistory(redditClient, username, subredditName, 100);
  const totalSubActivity = comments.length + postsCount;

  let milestone: string | null = null;
  if (milestoneEnabled && totalSubActivity > 0) {
    milestone = calculateMilestoneTier(totalSubActivity, milestoneTiersJson);
  }

  let specialist: string | null = null;
  if (specialistEnabled && comments.length > 0) {
    const commentsText = comments.map(c => c.body).join('\n---\n');
    specialist = await classifySpecialistRole(commentsText, specialistRoles, specialistPrompt);
  }

  let totalScore = 0;
  for (const c of comments) {
    totalScore += c.score;
  }
  const averageScore = comments.length > 0 ? totalScore / comments.length : 0;

  // Troll Mod Alert check
  const trollAlertEnabled = await settings.get<boolean>('troll_alert_enabled') ?? false;
  const trollMinComments = await settings.get<number>('troll_min_comments') ?? 10;
  const trollAverageScoreThreshold = await settings.get<number>('troll_average_score_threshold') ?? -30;

  if (trollAlertEnabled && comments.length >= trollMinComments && averageScore < trollAverageScoreThreshold) {
    const alertedKey = `troll_alerted:${username}`;
    const alreadyAlerted = await redis.get(alertedKey);
    if (!alreadyAlerted) {
      try {
        const subredditObj = await redditClient.getCurrentSubreddit();
        const subId = subredditObj.id;

        const subject = `⚠️ Troll Alert: u/${username}`;
        const trollMetrics: TrollAlertMetrics = {
          subredditName,
          username,
          averageScore,
          commentCount: comments.length,
          totalSubActivity,
          milestone,
          specialist,
        };

        const safeMode = await settings.get<boolean>('safe_mode') ?? true;
        let bodyMarkdown = buildTrollModmailBody(trollMetrics);
        if (!safeMode) {
          const sortedByScore = [...comments].sort((a, b) => a.score - b.score);
          const sampleComments = sortedByScore
            .slice(0, 8)
            .map((c) => `[score ${c.score}] ${c.body}`);
          const summary = await resolveModAttentionSummary({
            kind: 'troll_alert',
            subredditName,
            username,
            metrics: {
              averageScore,
              commentCount: comments.length,
              totalSubActivity,
              milestone,
              specialist,
            },
            sampleComments,
          });
          bodyMarkdown = buildTrollModmailBody(trollMetrics, summary);
        }

        if (safeMode) {
          console.log(
            `[SAFE MODE] Would send Troll Alert modmail for u/${username} (avg score: ${averageScore.toFixed(2)}). Body preview: ${bodyMarkdown.slice(0, 120)}...`
          );
        } else {
          await redditClient.modMail.createModInboxConversation({
            subject,
            bodyMarkdown,
            subredditId: subId as any
          });
          await redis.set(alertedKey, '1');
          await redis.expire(alertedKey, 86400 * 7); // Cooldown of 7 days
          console.log(`[ai-mod-suite] Sent Troll Alert Modmail for u/${username}`);
        }
      } catch (err) {
        console.error(`[ai-mod-suite] Error sending Troll Alert modmail:`, err);
      }
    }
  }

  return { milestone, specialist, averageScore };
}

function buildFlairString(
  milestone: string | null,
  specialist: string | null
): string {
  const parts: string[] = [];
  if (milestone) parts.push(milestone);
  if (specialist) parts.push(specialist);
  return parts.join(' | ');
}

async function applyUserFlair(
  subredditName: string,
  username: string,
  flairText: string
): Promise<void> {
  const text = truncateFlairText(flairText);
  console.log(`[ai-mod-suite] Setting user flair for u/${username} in r/${subredditName}: "${text}"`);
  await reddit.setUserFlair({
    subredditName,
    username,
    text,
  });
}


// --- Action Execution Pipeline ---
async function handleTriageAction(
  type: 'post-submit' | 'comment-submit',
  targetId: string,
  author: string,
  textSnippet: string,
  resultText: string,
  titleText: string | undefined,
  safeMode: boolean,
  actionMode: 'comment' | 'report' | 'modmail' | 'log'
): Promise<void> {
  const isPost = type === 'post-submit';
  const normAction = getSingleSettingValue<'comment' | 'report' | 'modmail' | 'log'>(actionMode, 'comment');
  console.log(`[ai-mod-suite] Triaging ${type} on ${targetId}: safeMode=${safeMode} mode=${normAction}`);

  if (safeMode) {
    console.log(`[SAFE MODE] Would execute action=${normAction} on ${targetId}. Result snippet: "${resultText.slice(0, 50)}..."`);
    await logAuditEvent({
      id: targetId + '_safe',
      eventType: type,
      targetId,
      author,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: `safe-mode (${normAction})`,
      safeMode: true,
      success: true,
      message: `Would perform ${normAction}: ${resultText.slice(0, 100)}...`,
    });
    return;
  }

  try {
    let message = '';
    if (normAction === 'comment') {
      console.log(`[ai-mod-suite] Posting comment reply on ${targetId}...`);
      await reddit.submitComment({
        id: targetId as any,
        text: formatBotPublicComment(resultText),
        runAs: 'APP',
      });
      message = 'Posted comment reply successfully';
    } else if (normAction === 'report') {
      console.log(`[ai-mod-suite] Reporting ${targetId}...`);
      if (isPost) {
        const post = await reddit.getPostById(targetId as any);
        await reddit.report(post, { reason: `AI Mod Suite summary: ${resultText.slice(0, 80)}` });
      } else {
        const comment = await reddit.getCommentById(targetId as any);
        await reddit.report(comment, { reason: `AI Mod Suite summary: ${resultText.slice(0, 80)}` });
      }
      message = 'Reported content successfully';
    } else if (normAction === 'modmail') {
      console.log(`[ai-mod-suite] Sending modmail escalation for ${targetId}...`);
      let subId = '';
      let link = '';
      if (isPost) {
        const post = await reddit.getPostById(targetId as any);
        subId = post.subredditId;
        link = `https://reddit.com${post.permalink}`;
      } else {
        const comment = await reddit.getCommentById(targetId as any);
        subId = comment.subredditId;
        link = `https://reddit.com${comment.permalink}`;
      }
      
      await reddit.modMail.createModInboxConversation({
        bodyMarkdown: `AI Mod Suite Triage Escalation:\n\nSummary:\n${resultText}\n\nLink: ${link}`,
        subject: `AI Mod Suite Alert: ${isPost ? 'Post' : 'Comment'} by u/${author}`,
        subredditId: subId as any,
      });
      message = 'Sent modmail escalation successfully';
    } else {
      message = 'Logged event (log-only)';
    }

    await logAuditEvent({
      id: targetId + '_live',
      eventType: type,
      targetId,
      author,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: normAction,
      safeMode: false,
      success: true,
      message,
    });
  } catch (err: any) {
    console.error(`[ai-mod-suite] Failed to execute action ${normAction}:`, err);
    await logAuditEvent({
      id: targetId + '_err',
      eventType: type,
      targetId,
      author,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: normAction,
      safeMode: false,
      success: false,
      message: `Error: ${err.message ?? err}`,
    });
  }
}

async function getContentPermalinkAndSubredditId(
  targetId: string,
  isPost: boolean
): Promise<{ link: string; subredditId: string }> {
  if (isPost) {
    const post = await reddit.getPostById(targetId as any);
    return {
      link: `https://reddit.com${post.permalink}`,
      subredditId: post.subredditId,
    };
  }
  const comment = await reddit.getCommentById(targetId as any);
  return {
    link: `https://reddit.com${comment.permalink}`,
    subredditId: comment.subredditId,
  };
}

async function handleModerationAction(
  type: 'post-submit' | 'comment-submit',
  targetId: string,
  author: string,
  textSnippet: string,
  reason: string,
  safeMode: boolean,
  action: 'report' | 'remove' | 'modmail' | 'log'
): Promise<void> {
  const isPost = targetId.startsWith('t3_');
  const normAction = getSingleSettingValue<'report' | 'remove' | 'modmail' | 'log'>(action, 'report');
  console.log(`[ai-mod-suite] Executing AI Moderation action=${normAction} on ${targetId}: safeMode=${safeMode}`);

  let subredditName: string | undefined;
  try {
    subredditName = (await reddit.getCurrentSubreddit()).name;
  } catch {
    subredditName = undefined;
  }

  const summaryKind = normAction === 'remove' ? 'removal' : 'violation';
  const summary = await resolveModAttentionSummary({
    kind: summaryKind,
    subredditName,
    username: author,
    contentExcerpt: textSnippet,
    ruleReason: reason,
  });

  if (safeMode) {
    console.log(`[SAFE MODE] Would execute AI Mod action=${normAction} on ${targetId}. Reason: ${reason}`);
    let explanationMsg = '';
    if (normAction === 'remove') {
      explanationMsg = `Would post public removal explanation.`;
    }
    const auditMsg = buildAuditMessage({
      action: `Would perform AI moderation ${normAction}`,
      reason,
      summary,
      extra: explanationMsg || undefined,
    });
    await logAuditEvent({
      id: targetId + '_mod_safe',
      eventType: 'ai-moderation',
      targetId,
      author,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: `safe-mode (${normAction})`,
      safeMode: true,
      success: true,
      message: auditMsg,
    });
    return;
  }

  try {
    let message = '';
    if (normAction === 'remove') {
      console.log(`[ai-mod-suite] Posting removal explanation reply on ${targetId}...`);
      const removalExplanation = buildRemovalPublicReply({ isPost, reason, summary });

      try {
        await reddit.submitComment({
          id: targetId as any,
          text: removalExplanation,
          runAs: 'APP',
        });
      } catch (commentErr) {
        console.error(`[ai-mod-suite] Failed to post removal explanation comment on ${targetId}:`, commentErr);
      }

      const removalModmailEnabled =
        (await settings.get<boolean>('removal_modmail_enabled')) ?? false;
      const summariesEnabled =
        (await settings.get<boolean>('mod_attention_summaries_enabled')) ?? false;
      if (removalModmailEnabled && summariesEnabled) {
        const { link, subredditId } = await getContentPermalinkAndSubredditId(targetId, isPost);
        await reddit.modMail.createModInboxConversation({
          bodyMarkdown: buildRemovalModmailBody({
            author,
            isPost,
            reason,
            summary,
            link,
          }),
          subject: `AI Mod Suite Removal: u/${author}`,
          subredditId: subredditId as any,
        });
        message = `Removed content, posted explanation, and sent removal modmail. Reason: ${reason}`;
      } else {
        message = `Removed content and posted explanation reply successfully. Reason: ${reason}`;
      }

      console.log(`[ai-mod-suite] Removing content ${targetId}...`);
      await reddit.remove(targetId as any, false);
    } else if (normAction === 'report') {
      console.log(`[ai-mod-suite] Reporting content ${targetId}...`);
      const reportReason = buildReportReason(reason, summary);
      if (isPost) {
        const post = await reddit.getPostById(targetId as any);
        await reddit.report(post, { reason: reportReason });
      } else {
        const comment = await reddit.getCommentById(targetId as any);
        await reddit.report(comment, { reason: reportReason });
      }
      message = buildAuditMessage({ action: 'Reported content', reason, summary });
    } else if (normAction === 'modmail') {
      console.log(`[ai-mod-suite] Sending modmail escalation for ${targetId}...`);
      const { link, subredditId } = await getContentPermalinkAndSubredditId(targetId, isPost);

      await reddit.modMail.createModInboxConversation({
        bodyMarkdown: buildViolationModmailBody({
          author,
          isPost,
          reason,
          summary,
          link,
        }),
        subject: `AI Moderation Alert: u/${author}`,
        subredditId: subredditId as any,
      });
      message = buildAuditMessage({ action: 'Sent modmail escalation', reason, summary });
    } else {
      message = buildAuditMessage({ action: 'Logged violation (log-only)', reason, summary });
    }

    await logAuditEvent({
      id: targetId + '_mod_live',
      eventType: 'ai-moderation',
      targetId,
      author,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: normAction,
      safeMode: false,
      success: true,
      message,
    });
  } catch (err: any) {
    console.error(`[ai-mod-suite] Failed to execute moderation action ${normAction}:`, err);
    await logAuditEvent({
      id: targetId + '_mod_err',
      eventType: 'ai-moderation',
      targetId,
      author,
      textSnippet: textSnippet.slice(0, 100),
      actionTaken: normAction,
      safeMode: false,
      success: false,
      message: `Error: ${err.message ?? err}`,
    });
  }
}

async function handleSummonReply(params: {
  eventType: 'post-submit' | 'comment-submit';
  targetId: string;
  authorName: string;
  text: string;
  safeMode: boolean;
  actionMode: 'comment' | 'report' | 'modmail' | 'log';
}): Promise<boolean> {
  const { eventType, targetId, authorName, text, safeMode, actionMode } = params;
  const normAction = getSingleSettingValue(actionMode, 'comment');

  console.log(`[ai-mod-suite] Summon detected on ${targetId}, calling LLM... actionMode=${JSON.stringify(actionMode)} norm=${normAction}`);
  const reply = await generateSummonReply(text);
  if (!reply) return false;

  const formattedReply = formatBotPublicComment(reply);

  if (safeMode) {
    console.log(`[SAFE MODE] Would post summon reply on ${targetId}: ${reply}`);
    await logAuditEvent({
      id: targetId + '_summon_safe',
      eventType,
      targetId,
      author: authorName,
      textSnippet: text.slice(0, 100),
      actionTaken: 'summon-reply (safe-mode)',
      safeMode: true,
      success: true,
      message: `Would reply to summon: ${reply.slice(0, 100)}...`,
    });
    return true;
  }

  if (normAction === 'comment') {
    console.log(`[ai-mod-suite] Posting summon reply on ${targetId}...`);
    await reddit.submitComment({
      id: targetId as any,
      text: formattedReply,
      runAs: 'APP',
    });
    console.log(`[ai-mod-suite] Summon reply posted on ${targetId} ✅`);
    await logAuditEvent({
      id: targetId + '_summon_live',
      eventType,
      targetId,
      author: authorName,
      textSnippet: text.slice(0, 100),
      actionTaken: 'summon-reply',
      safeMode: false,
      success: true,
      message: 'Posted summon reply successfully',
    });
    return true;
  }

  console.log(`[ai-mod-suite] Summon reply logged only (doesn't reply) on ${targetId} normAction=${normAction}`);
  await logAuditEvent({
    id: targetId + '_summon_log_only',
    eventType,
    targetId,
    author: authorName,
    textSnippet: text.slice(0, 100),
    actionTaken: 'summon-reply (log-only)',
    safeMode: false,
    success: true,
    message: "Logged summon event (log-only/doesn't reply)",
  });
  return true;
}

// --- Post Submit ---
app.post('/internal/triggers/post-submit', async (c) => {
  try {
    const event = await c.req.json<{
      post?: {
        id?: string;
        selftext?: string;
        title?: string;
        url?: string;
        crosspostParentId?: string;
      };
      author?: { name?: string };
    }>();

    const postId = event.post?.id ?? '';
    const authorName = event.author?.name ?? '';
    let text = event.post?.selftext ?? '';
    let title = event.post?.title ?? '';
    let postUrl = event.post?.url ?? '';
    let crosspostParentId = event.post?.crosspostParentId ?? '';

    // Fetch settings
    const safeMode = await settings.get<boolean>('safe_mode') ?? true;
    const aiSummonsEnabled = await settings.get<boolean>('ai_summons_enabled') ?? false;
    const aiTldrEnabled = await settings.get<boolean>('ai_tldr_enabled') ?? false;
    const redditReferenceTldrEnabled =
      (await settings.get<boolean>('reddit_reference_tldr_enabled')) ?? false;
    const tldrWordCount = await settings.get<number>('tldr_word_count') ?? 250;
    const actionMode = getSingleSettingValue(await settings.get('action_mode'), 'comment') as 'comment' | 'report' | 'modmail' | 'log';
    const postTldrPin = settingsFlag(await settings.get('post_tldr_pin'));
    const commentSummaryPin = settingsFlag(await settings.get('comment_summary_pin'));
    const pinTopLevelBotComment = shouldPinTopLevelBotComment(postTldrPin, commentSummaryPin);

    console.log(`[ai-mod-suite] PostSubmit: postId=${postId} author=${authorName} safeMode=${safeMode} mode=${actionMode}`);

    if (!postId) return c.json<TriggerResponse>({ status: 'ignored: no postId' });
    if (isAppAuthored(authorName)) return c.json<TriggerResponse>({ status: 'ignored: app-authored' });
    if (await hasProcessed(postId)) return c.json<TriggerResponse>({ status: 'duplicate' });

    // Run AI Moderation Check
    const aiModerationEnabled = await settings.get<boolean>('ai_moderation_enabled') ?? false;
    if (aiModerationEnabled) {
      const rulesPrompt = await settings.get<string>('moderation_prompt') ?? '';
      const moderationAction = getSingleSettingValue(await settings.get('moderation_action'), 'report') as 'report' | 'remove' | 'modmail' | 'log';
      
      console.log(`[ai-mod-suite] Running AI Moderation check for post ${postId}...`);
      const moderationResult = await evaluateContentForViolation(`Title: ${title}\n\n${text}`, rulesPrompt);
      if (moderationResult && moderationResult.violates) {
        console.log(`[ai-mod-suite] Post ${postId} violates rules: ${moderationResult.reason}`);
        await handleModerationAction(
          'post-submit',
          postId,
          authorName,
          text,
          moderationResult.reason,
          safeMode,
          moderationAction
        );
        
        if (moderationAction === 'remove') {
          return c.json<TriggerResponse>({ status: 'ok: removed' });
        }
      }
    }

    let crosspostParentIdResolved = crosspostParentId;
    try {
      const fullPost = await reddit.getPostById(postId as any);
      if (fullPost) {
        if (!text.trim() && fullPost.body) text = fullPost.body;
        if (!title.trim() && fullPost.title) title = fullPost.title;
        if (!postUrl && fullPost.url) postUrl = fullPost.url;
        if (!crosspostParentIdResolved) {
          crosspostParentIdResolved = readCrosspostParentId(
            fullPost as unknown as Record<string, unknown>
          );
        }
      }
    } catch (err) {
      console.error(`[ai-mod-suite] getPostById enrich failed for ${postId}:`, err);
    }

    const wordCount = countWords(text);
    if (aiTldrEnabled && wordCount >= tldrWordCount) {
      console.log(`[ai-mod-suite] Calling LLM for post TLDR on ${postId}...`);
      const tldr = await generateTldr(`Title: ${title}\n\n${text}`);
      if (tldr) {
        const formattedTldr = formatBotPublicComment(`**TLDR**\n\n${tldr}`);
        await submitPostTopLevelBotComment({
          postId,
          authorName,
          textSnippet: text,
          commentText: formattedTldr,
          safeMode,
          shouldPin: pinTopLevelBotComment,
          auditLabel: 'post TLDR',
        });
      }
    } else if (aiTldrEnabled && redditReferenceTldrEnabled && wordCount <= tldrWordCount) {
      console.log(
        `[ai-mod-suite] Post ${postId} short locally (${wordCount} words); checking Reddit reference for TLDR...`
      );
      const resolved = await resolveRedditReferenceContent(reddit, {
        postId,
        title,
        selftext: text,
        crosspostParentId: crosspostParentIdResolved,
        url: postUrl,
      });
      if (!resolved) {
        console.log(`[ai-mod-suite] No resolvable Reddit reference for post ${postId}`);
      } else {
        const sourceWordCount = countWords(resolved.body);
        if (sourceWordCount <= tldrWordCount) {
          console.log(
            `[ai-mod-suite] Referenced content ${resolved.sourceId} too short (${sourceWordCount} words)`
          );
        } else {
          const subLabel = resolved.subredditName ? `r/${resolved.subredditName}` : 'Reddit';
          const refKind = resolved.kind === 'crosspost' ? 'crosspost' : 'link';
          const llmInput = `Referenced Reddit content (${refKind} from ${subLabel}):\nTitle: ${resolved.title}\n\n${resolved.body}`;
          console.log(
            `[ai-mod-suite] Calling LLM for Reddit reference TLDR on ${postId} (source ${resolved.sourceId}, ${sourceWordCount} words)...`
          );
          const tldr = await generateTldr(llmInput);
          if (tldr) {
            const formattedTldr = formatBotPublicComment(`**TLDR**\n\n${tldr}`);
            await submitPostTopLevelBotComment({
              postId,
              authorName,
              textSnippet: text,
              commentText: formattedTldr,
              safeMode,
              shouldPin: pinTopLevelBotComment,
              auditLabel: 'reference post TLDR',
            });
          }
        }
      }
    } else {
      console.log(`[ai-mod-suite] Post ${postId} too short (${wordCount} words) or TLDR disabled`);
    }

    const combinedPostText = `${title} ${text}`.trim();
    if (aiSummonsEnabled && isSummon(combinedPostText)) {
      if (isHostileSummon(combinedPostText)) {
        console.log(`[ai-mod-suite] Skipping hostile post summon from u/${authorName}`);
        return c.json<TriggerResponse>({ status: 'ok: hostile summon skipped' });
      }
      if (isLikelyBotUsername(authorName)) {
        console.log(`[ai-mod-suite] Skipping post summon from likely bot u/${authorName}`);
        return c.json<TriggerResponse>({ status: 'ok: bot author skipped' });
      }
      const handled = await handleSummonReply({
        eventType: 'post-submit',
        targetId: postId,
        authorName,
        text: combinedPostText,
        safeMode,
        actionMode,
      });
      if (handled) {
        return c.json<TriggerResponse>({ status: 'ok: post summon' });
      }
    }

    return c.json<TriggerResponse>({ status: 'ok' });
  } catch (err) {
    console.error('[ai-mod-suite] Error in post-submit:', err);
    return c.json<TriggerResponse>({ status: 'error' }, 500);
  }
});

// --- Comment Submit ---
app.post('/internal/triggers/comment-submit', async (c) => {
  try {
    const event = await c.req.json<{
      comment?: { id?: string; body?: string };
      author?: { name?: string };
    }>();

    const commentId = event.comment?.id ?? '';
    const authorName = event.author?.name ?? '';
    const body = event.comment?.body ?? '';

    // Fetch settings
    const safeModeRaw = await settings.get('safe_mode');
    const safeMode =
      safeModeRaw === undefined || safeModeRaw === null
        ? true
        : settingsFlag(safeModeRaw);
    const aiSummonsEnabled = settingsFlag(await settings.get('ai_summons_enabled'));
    const commentTldrEnabled = settingsFlag(await settings.get('comment_tldr_enabled'));
    const commentTldrWordCount = settingsNumber(
      await settings.get('comment_tldr_word_count'),
      250
    );
    const commentTldrPrompt = await settings.get<string>('comment_tldr_prompt') ?? 
      `You are a helpful assistant for a Reddit moderation bot. Read the following Reddit comment and its parent context, and write a concise TLDR in 2-3 sentences. Be neutral, factual and friendly. Start with "TLDR:".`;
    const actionMode = getSingleSettingValue(
      await settings.get('action_mode'),
      'comment'
    ) as 'comment' | 'report' | 'modmail' | 'log';

    console.log(`[ai-mod-suite] CommentSubmit: commentId=${commentId} author=${authorName} safeMode=${safeMode} mode=${actionMode}`);

    if (!commentId || !body) return c.json<TriggerResponse>({ status: 'ignored' });
    if (isAppAuthored(authorName)) return c.json<TriggerResponse>({ status: 'ignored: app-authored' });

    // Fetch full comment details for reliable post ID and subName
    let comment: any = null;
    try {
      comment = await reddit.getCommentById(commentId as any);
    } catch (err) {
      console.error(`[ai-mod-suite] Error fetching comment details for ${commentId}:`, err);
    }

    const subName = comment?.subredditName ?? (await reddit.getCurrentSubreddit()).name;
    const postId = comment?.postId ?? '';

    let parentCommentForRouting: any = null;
    if (comment?.parentId?.startsWith('t1_')) {
      try {
        parentCommentForRouting = await reddit.getCommentById(comment.parentId as any);
      } catch (err) {
        console.error(`[ai-mod-suite] Error fetching parent comment:`, err);
      }
    }
    const parentAuthorResolved = resolveCommentAuthorName(parentCommentForRouting);
    const parentIsAppComment = isAppAuthored(parentAuthorResolved);
    const textBody = resolveCommentBody(comment, body);

    // Flair commands first (user-initiated; must not run behind moderation/TLDR/summary)
    const flairEnabled = settingsFlag(await settings.get('flair_enabled'));
    const command = (await settings.get<string>('flair_command'))?.trim() || '!flair';
    const flairMatch = matchFlairCommand(textBody, command, { parentIsAppComment });

    if (flairEnabled && flairMatch.matched) {
      const action = parseFlairSubCommand(flairMatch.subCommand);
      console.log(
        `[ai-mod-suite] Flair command from u/${authorName}: "${textBody.slice(0, 80)}" → action=${action}`
      );

      if (action === 'off') {
        if (safeMode) {
          console.log(`[SAFE MODE] Would remove flair for u/${authorName}`);
        } else {
          try {
            await reddit.removeUserFlair(subName, authorName);
          } catch (err) {
            console.error(`[ai-mod-suite] removeUserFlair failed:`, err);
          }
        }

        await reddit.submitComment({
          id: commentId as any,
          text: formatBotPublicComment(
            safeMode
              ? `[SAFE MODE] Would remove your flair. Use \`${command} on\` when safe mode is off.`
              : `Done! I've removed your flair. You can turn it back on anytime with \`${command} on\`. 🚀`
          ),
          runAs: 'APP',
        });
        return c.json<TriggerResponse>({ status: 'ok: flair off' });
      }

      let milestone: string | null = null;
      let specialist: string | null = null;
      let averageScore = 0;
      const cachedKey = `flair_cache:${authorName}`;
      const flairCacheTtlMs = 3600_000;

      try {
        let usedCache = false;
        if (action === 'on') {
          const cachedRaw = await redis.get(cachedKey);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw) as {
              milestone?: string | null;
              specialist?: string | null;
              averageScore?: number;
              timestamp?: number;
            };
            const age = Date.now() - (parsed.timestamp ?? 0);
            if (age < flairCacheTtlMs && (parsed.milestone || parsed.specialist)) {
              milestone = parsed.milestone ?? null;
              specialist = parsed.specialist ?? null;
              averageScore = parsed.averageScore ?? 0;
              usedCache = true;
              console.log(
                `[ai-mod-suite] Flair apply using cached scan for u/${authorName}: ${buildFlairString(milestone, specialist)}`
              );
            }
          }
        }

        // Check/refresh always rescan; apply reuses last scan so preview matches Reddit flair
        if (!usedCache) {
          const fresh = await processUserFlair(reddit, authorName, subName);
          milestone = fresh.milestone;
          specialist = fresh.specialist;
          averageScore = fresh.averageScore;
          await redis.set(
            cachedKey,
            JSON.stringify({ milestone, specialist, averageScore, timestamp: Date.now() })
          );
          await redis.expire(cachedKey, 86400 * 7);
        }
      } catch (err) {
        console.error(`[ai-mod-suite] processUserFlair failed for u/${authorName}:`, err);
        await reddit.submitComment({
          id: commentId as any,
          text: formatBotPublicComment(
            `I received your flair command but couldn't scan your activity right now. Please try \`${command}\` again in a minute.`
          ),
          runAs: 'APP',
        });
        return c.json<TriggerResponse>({ status: 'ok: flair scan error' });
      }

      const flairText = buildFlairString(milestone, specialist);
      let responseText = '';
      if (action === 'on') {
        if (!flairText) {
          responseText = `I analyzed your activity in r/${subName}, but you don't qualify for any milestone or specialist roles yet! Keep active and try again later. 😊`;
        } else if (safeMode) {
          console.log(`[SAFE MODE] Would update flair for u/${authorName} to "${flairText}"`);
          responseText = `[SAFE MODE] Would apply flair: \`${flairText}\`\n\nTurn off Safe Mode and run \`${command} on\` again to apply it on Reddit.`;
        } else {
          try {
            await applyUserFlair(subName, authorName, flairText);
            responseText = `Your user flair is now active! 🚀\n\n**Flair Applied:** \`${truncateFlairText(flairText)}\`\n\nTo turn it off, use \`${command} off\`.`;
          } catch (err: any) {
            console.error(`[ai-mod-suite] setUserFlair failed for u/${authorName}:`, err);
            responseText =
              `I found your flair (\`${flairText}\`) but Reddit did not accept the update. ` +
              `Mods: in **Mod Tools → User flair**, turn on **Allow flair in your community** (templates are optional for text flairs). ` +
              `Then try \`${command} on\` again.`;
          }
        }
      } else {
        if (!flairText) {
          responseText = `Here's your flair status in r/${subName}:\n\nYou don't qualify for any milestone or specialist roles yet. Keep posting and commenting to unlock them!`;
        } else {
          const previewFlair = truncateFlairText(buildFlairString(milestone, specialist));
          responseText =
            `Here's your current qualification in r/${subName}:\n\n` +
            `**Milestone Tier:** ${milestone || 'None'}\n` +
            `**Specialist Role:** ${specialist || 'None'}\n` +
            `**Flair preview:** \`${previewFlair}\`\n\n` +
            `To activate this as your flair, comment \`${command} on\` (or reply \`on\` under this message). ` +
            `Use \`${command} refresh\` to rescan before applying.`;
        }
      }

      await reddit.submitComment({
        id: commentId as any,
        text: formatBotPublicComment(responseText),
        runAs: 'APP',
      });
      return c.json<TriggerResponse>({ status: 'ok: flair command handled' });
    }

    if (await hasProcessed(commentId)) return c.json<TriggerResponse>({ status: 'duplicate' });

    const completeCommentSubmit = async (response: TriggerResponse) => {
      if (postId) {
        try {
          await maybeUpdateDiscussionSummary(postId, safeMode);
        } catch (err) {
          console.error(`[ai-mod-suite] Discussion summary failed on post ${postId}:`, err);
        }
      }
      return c.json<TriggerResponse>(response);
    };

    // Summons first — user-facing; must not run behind discussion-summary LLM (trigger timeout)
    if (aiSummonsEnabled && isSummon(textBody)) {
      if (isHostileSummon(textBody)) {
        console.log(`[ai-mod-suite] Skipping hostile summon from u/${authorName}`);
        return completeCommentSubmit({ status: 'ok: hostile summon skipped' });
      }
      if (isLikelyBotUsername(authorName)) {
        console.log(`[ai-mod-suite] Skipping summon from likely bot u/${authorName}`);
        return completeCommentSubmit({ status: 'ok: bot author skipped' });
      }
      const summonHandled = await handleSummonReply({
        eventType: 'comment-submit',
        targetId: commentId,
        authorName,
        text: textBody,
        safeMode,
        actionMode: getSingleSettingValue(actionMode, 'comment'),
      });
      if (summonHandled) {
        return completeCommentSubmit({ status: 'ok: summon reply' });
      }
    }

    // Run AI Moderation Check
    const aiModerationEnabled = settingsFlag(await settings.get('ai_moderation_enabled'));
    if (aiModerationEnabled) {
      const rulesPrompt = await settings.get<string>('moderation_prompt') ?? '';
      const moderationAction = (await settings.get<string>('moderation_action') ?? 'report') as 'report' | 'remove' | 'modmail' | 'log';
      
      console.log(`[ai-mod-suite] Running AI Moderation check for comment ${commentId}...`);
      const moderationResult = await evaluateContentForViolation(textBody, rulesPrompt);
      if (moderationResult && moderationResult.violates) {
        console.log(`[ai-mod-suite] Comment ${commentId} violates rules: ${moderationResult.reason}`);
        await handleModerationAction(
          'comment-submit',
          commentId,
          authorName,
          textBody,
          moderationResult.reason,
          safeMode,
          moderationAction
        );
        
        if (moderationAction === 'remove') {
          return completeCommentSubmit({ status: 'ok: removed' });
        }
      }
    }

    // Comment TLDR (full body from API)
    if (
      await maybeHandleCommentTldr({
        commentId,
        authorName,
        textBody,
        commentTldrEnabled,
        commentTldrWordCount,
        commentTldrPrompt,
        safeMode,
      })
    ) {
      return completeCommentSubmit({ status: 'ok: comment tldr' });
    }

    // Add user to background scanning queue (for automatic scans)
    if (flairEnabled) {
      await redis.hSet('flair_scan_queue', { [authorName]: '1' });
    }

    // Handle Conversational Inbox Replies (Step 4)
    const conversationalRepliesEnabled = settingsFlag(await settings.get('conversational_replies_enabled'));

    const conversationalFlairMatch = matchFlairCommand(textBody, command, { parentIsAppComment });
    if (
      conversationalRepliesEnabled &&
      comment &&
      comment.parentId.startsWith('t1_') &&
      parentIsAppComment &&
      !(flairEnabled && conversationalFlairMatch.matched)
    ) {
      const cooldownKey = `reply_cooldown:${authorName}`;
      const onCooldown = await redis.get(cooldownKey);

      if (onCooldown) {
        console.log(`[ai-mod-suite] Conversational reply to u/${authorName} ignored: cooldown active`);
      } else {
        const dailyLimit = await settings.get<number>('conversational_replies_daily_limit') ?? 30;
        const today = new Date().toISOString().split('T')[0];
        const countKey = `reply_count:${today}`;
        const countStr = await redis.get(countKey) ?? '0';
        const count = parseInt(countStr, 10);

        if (count >= dailyLimit) {
          console.log(`[ai-mod-suite] Conversational reply ignored: daily limit reached`);
        } else {
          console.log(`[ai-mod-suite] Generating conversational reply to u/${authorName}...`);
          const contextChain = await getParentChainContext(commentId, reddit);
          const customPrompt = await settings.get<string>('conversational_replies_prompt');
            const replyText = await generateConversationalReply(textBody, contextChain, customPrompt);

          if (replyText) {
            const replyBody = formatBotPublicComment(replyText);
            if (safeMode) {
              console.log(`[SAFE MODE] Would post conversational reply to u/${authorName}: "${replyText}"`);
            } else {
              await reddit.submitComment({
                id: commentId as any,
                text: replyBody,
                runAs: 'APP',
              });

              const cooldownHours = Number(await settings.get<number>('conversational_replies_cooldown')) || 0;
              if (cooldownHours > 0) {
                await redis.set(cooldownKey, '1');
                await redis.expire(cooldownKey, cooldownHours * 3600);
              }

              await redis.set(countKey, String(count + 1));
              await redis.expire(countKey, 86400 * 2);
              console.log(`[ai-mod-suite] Conversational reply posted to u/${authorName} ✅`);
            }
            return completeCommentSubmit({ status: 'ok: conversational reply' });
          }
        }
      }
    }

    return completeCommentSubmit({ status: 'ok' });
  } catch (err) {
    console.error('[ai-mod-suite] Error in comment-submit:', err);
    return c.json<TriggerResponse>({ status: 'error' }, 500);
  }
});

// --- Cron: Scheduled Tasks Removed ---

// --- Cron: Flair Background Security Scan (Step 6) ---
app.post('/internal/cron/flair-background-scan', async (c) => {
  try {
    const flairEnabled = await settings.get<boolean>('flair_enabled') ?? false;
    if (!flairEnabled) {
      return c.json({ status: 'disabled' });
    }
    
    const safeMode = await settings.get<boolean>('safe_mode') ?? true;
    const flairMode = await settings.get<string>('flair_mode') ?? 'command';
    const subName = (await reddit.getCurrentSubreddit()).name;
    
    // Pop up to 10 users from background scan queue
    const queuedUsers = await redis.hKeys('flair_scan_queue');
    if (!queuedUsers || queuedUsers.length === 0) {
      return c.json({ status: 'empty queue' });
    }
    
    const usersToProcess = queuedUsers.slice(0, 10);
    
    console.log(`[ai-mod-suite] Processing background flair scan for users: ${usersToProcess.join(', ')}`);
    
    for (const username of usersToProcess) {
      const { milestone, specialist, averageScore } = await processUserFlair(reddit, username, subName);
      
      const cachedKey = `flair_cache:${username}`;
      await redis.set(cachedKey, JSON.stringify({ milestone, specialist, averageScore, timestamp: Date.now() }));
      await redis.expire(cachedKey, 86400 * 7); // Cache for 7 days
      
      if (flairMode === 'automatic') {
        const flairText = buildFlairString(milestone, specialist);
        if (flairText) {
          if (safeMode) {
            console.log(`[SAFE MODE] Would update flair for u/${username} to "${flairText}"`);
          } else {
            await applyUserFlair(subName, username, flairText);
          }
        }
      }
      
      // Remove from queue
      await redis.hDel('flair_scan_queue', [username]);
    }
    
    return c.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[ai-mod-suite] Error in flair background scan cron:', err);
    return c.json({ status: 'error', error: err.message }, 500);
  }
});
const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const url = `http://localhost${req.url}`;
  const request = new Request(url, {
    method: req.method ?? 'GET',
    headers: req.headers as Record<string, string>,
    body: body?.length ? body : undefined,
  });

  const response = await app.fetch(request);
  const responseBody = await response.arrayBuffer();
  const buf = Buffer.from(responseBody);
  const headers = Object.fromEntries(response.headers.entries());
  headers['content-length'] = String(buf.length);

  res.writeHead(response.status, headers);
  res.end(buf);
});

const port = getServerPort();
server.listen(port, () => {
  console.log(`[ai-mod-suite] Server listening on port ${port}`);
});
