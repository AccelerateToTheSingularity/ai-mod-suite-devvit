/** Normalize author username from Devvit/R Reddit comment objects. */
export function resolveCommentAuthorName(comment: unknown): string {
  if (!comment || typeof comment !== 'object') return '';
  const c = comment as Record<string, unknown>;
  if (typeof c.authorName === 'string' && c.authorName.trim()) {
    return c.authorName.trim();
  }
  const author = c.author;
  if (author && typeof author === 'object') {
    const a = author as Record<string, unknown>;
    if (typeof a.name === 'string' && a.name.trim()) return a.name.trim();
  }
  if (typeof author === 'string' && author.trim()) return author.trim();
  return '';
}
