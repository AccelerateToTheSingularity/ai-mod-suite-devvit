# Developer Data Protection Addendum (DPA) — summary

**Source:** [Developer DPA](https://www.redditinc.com/policies/developer-dpa) (effective March 4, 2024)  
**Incorporated into:** [Reddit Developer Terms](https://redditinc.com/policies/developer-terms)

## When the DPA applies

The DPA applies when you **receive, access, or process Reddit Personal Data** through Developer Services — including usernames, post/comment text, and other identifiable information from installed subreddits.

## Roles

- You and Reddit are each an **independent controller** of Reddit Personal Data you process.
- Each party must comply with applicable data protection laws for its own processing.

## Your obligations (summary)

1. Use Reddit Personal Data **only** as permitted in the Developer Terms.
2. Implement **appropriate technical and organizational measures** to protect data.
3. Treat Reddit Personal Data as **confidential**.
4. **Subprocessors:** Transfers to third parties (e.g. Google Gemini, OpenAI) require contracts or terms ensuring adequate protection — disclose them in your privacy policy.
5. **Deletion:** Delete Reddit Personal Data when requested by Reddit or users (within required timelines), and when no longer needed for permitted app functionality.

## Cross-border transfers

If you transfer personal data internationally, comply with applicable transfer mechanisms (SCCs, etc.) as described in the DPA for GDPR/UK/Swiss data.

## AI Mod Suite — what we process

| Data | Purpose | Typical retention |
|------|---------|-------------------|
| Usernames (`authorName`) | Idempotency, cooldowns, flair, audit | See [privacy-policy.md](../legal/privacy-policy.md) |
| Post/comment IDs | Duplicate prevention | ~24 hours (idempotency keys) |
| Short text snippets | Audit log (≤100 chars) | Last 100 audit entries in Redis |
| Post/comment body (subset) | Sent to LLM for inference | Not stored long-term by app; held in LLM provider per their policy |
| Subreddit settings | Feature configuration | While app is installed |

## Security incidents

Notify Reddit promptly if a breach affects Reddit Personal Data, and cooperate with Reddit on user/regulator requests unless law requires otherwise.

Full text: [redditinc.com/policies/developer-dpa](https://www.redditinc.com/policies/developer-dpa)
