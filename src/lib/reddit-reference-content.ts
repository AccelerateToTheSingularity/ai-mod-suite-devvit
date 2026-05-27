/** Resolve Reddit crossposts and reddit.com permalinks for reference TLDR (no external HTTP fetch). */

export type ResolvedRedditReference = {
  kind: 'crosspost' | 'link';
  sourceId: string;
  subredditName?: string;
  title: string;
  body: string;
};

const REDDIT_HOSTS = new Set([
  'reddit.com',
  'www.reddit.com',
  'old.reddit.com',
  'np.reddit.com',
  'new.reddit.com',
]);

/** Match /r/{sub}/comments/{postId}/... with optional comment segment */
const REDDIT_POST_PATH =
  /\/r\/[^/]+\/comments\/([a-z0-9]+)(?:\/[^/]*)?(?:\/([a-z0-9]+))?\/?/i;

const REDDIT_URL_IN_TEXT =
  /https?:\/\/(?:www\.|old\.|np\.|new\.)?reddit\.com\/r\/[^/\s]+\/comments\/[a-z0-9]+(?:\/[^/\s]*)?(?:\/[a-z0-9]+)?\/?/gi;

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeThingId(id: string, prefix: 't3' | 't1'): string {
  const trimmed = id.trim();
  if (trimmed.startsWith(`${prefix}_`)) return trimmed;
  return `${prefix}_${trimmed}`;
}

export function isRedditHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (REDDIT_HOSTS.has(host)) return true;
  return host.endsWith('.reddit.com');
}

export function parseRedditUrl(urlString: string): { type: 'post' | 'comment'; id: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return null;
  }

  if (!isRedditHostname(parsed.hostname)) return null;

  const match = parsed.pathname.match(REDDIT_POST_PATH);
  if (!match) return null;

  const postId = match[1];
  const commentId = match[2];
  if (commentId) {
    return { type: 'comment', id: normalizeThingId(commentId, 't1') };
  }
  return { type: 'post', id: normalizeThingId(postId, 't3') };
}

export function findFirstRedditUrlInText(text: string): string | null {
  const m = text.match(REDDIT_URL_IN_TEXT);
  return m?.[0] ?? null;
}

/** Minimal Reddit client surface used for reference resolution (Devvit Post/Comment types). */
type RedditClient = {
  getPostById: (id: any) => Promise<any>;
  getCommentById: (id: any) => Promise<any>;
};

async function loadPostContent(
  reddit: RedditClient,
  postId: string,
  kind: 'crosspost' | 'link'
): Promise<ResolvedRedditReference | null> {
  try {
    const post = await reddit.getPostById(postId as any);
    if (!post) return null;
    const body = post.body ?? '';
    const title = post.title ?? '';
    if (!title && !body) return null;
    return {
      kind,
      sourceId: postId,
      subredditName: post.subredditName,
      title,
      body,
    };
  } catch (err) {
    console.error(`[ai-mod-suite] Failed to load post ${postId} for reference TLDR:`, err);
    return null;
  }
}

async function loadCommentContent(
  reddit: RedditClient,
  commentId: string
): Promise<ResolvedRedditReference | null> {
  try {
    const comment = await reddit.getCommentById(commentId as any);
    if (!comment?.body) return null;
    return {
      kind: 'link',
      sourceId: commentId,
      subredditName: comment.subredditName,
      title: '(linked comment)',
      body: comment.body,
    };
  } catch (err) {
    console.error(`[ai-mod-suite] Failed to load comment ${commentId} for reference TLDR:`, err);
    return null;
  }
}

async function resolveFromThingId(
  reddit: RedditClient,
  parsed: { type: 'post' | 'comment'; id: string },
  kind: 'crosspost' | 'link'
): Promise<ResolvedRedditReference | null> {
  if (parsed.type === 'comment') {
    return loadCommentContent(reddit, parsed.id);
  }
  return loadPostContent(reddit, parsed.id, kind);
}

export type PostSubmitReferenceInput = {
  postId: string;
  title: string;
  selftext: string;
  crosspostParentId?: string;
  url?: string;
};

/** Devvit / Reddit post objects may expose crosspost parent under different fields. */
export function readCrosspostParentId(post: Record<string, unknown> | null | undefined): string {
  if (!post) return '';
  const direct = post.crosspostParentId;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const parent = post.crosspostParent as { id?: string } | undefined;
  if (parent?.id) return String(parent.id).trim();
  const root = post.crosspostRootId;
  if (typeof root === 'string' && root.trim()) return root.trim();
  return '';
}

/**
 * Resolve referenced Reddit content for TLDR when local selftext is short.
 * Priority: crosspostParentId → post.url → URLs in title/selftext → fetch submitted post.
 */
export async function resolveRedditReferenceContent(
  reddit: RedditClient,
  input: PostSubmitReferenceInput
): Promise<ResolvedRedditReference | null> {
  const { postId, title, selftext, crosspostParentId, url } = input;

  if (crosspostParentId?.trim()) {
    const id = crosspostParentId.startsWith('t3_')
      ? crosspostParentId
      : normalizeThingId(crosspostParentId, 't3');
    const resolved = await loadPostContent(reddit, id, 'crosspost');
    if (resolved) return resolved;
  }

  if (url?.trim()) {
    const parsed = parseRedditUrl(url);
    if (parsed) {
      const resolved = await resolveFromThingId(reddit, parsed, 'link');
      if (resolved) return resolved;
    }
  }

  const combined = `${title}\n${selftext}`;
  const linkInText = findFirstRedditUrlInText(combined);
  if (linkInText) {
    const parsed = parseRedditUrl(linkInText);
    if (parsed) {
      const resolved = await resolveFromThingId(reddit, parsed, 'link');
      if (resolved) return resolved;
    }
  }

  if (postId) {
    try {
      const post = await reddit.getPostById(postId as any);
      if (post) {
        const parentId = readCrosspostParentId(post as Record<string, unknown>);
        if (parentId) {
          const id = parentId.startsWith('t3_') ? parentId : normalizeThingId(parentId, 't3');
          const resolved = await loadPostContent(reddit, id, 'crosspost');
          if (resolved) return resolved;
        }
        if (post.url?.trim()) {
          const parsed = parseRedditUrl(post.url);
          if (parsed) {
            const resolved = await resolveFromThingId(reddit, parsed, 'link');
            if (resolved) return resolved;
          }
        }
      }
    } catch (err) {
      console.error(`[ai-mod-suite] Fallback getPostById failed for ${postId}:`, err);
    }
  }

  return null;
}
