import { resolveCommentAuthorName } from './reddit-author.js';

export const isAppAuthored = (authorName: string) => {
  return authorName === "OptimistPrime_AI_Bot" || authorName === "ai-mod-suite-bot";
};

export function isAppAuthoredComment(comment: unknown): boolean {
  return isAppAuthored(resolveCommentAuthorName(comment));
}
