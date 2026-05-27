---
title: AI Mod Suite for Devvit
description: Installable Devvit moderation assistant for TLDRs, discussion digests, AI triage, safe-mode audits, and local reputation flairs.
---

# AI Mod Suite for Devvit

AI Mod Suite is an installable Reddit moderation assistant built on Devvit. It helps moderators understand long posts, digest busy discussions, answer direct community summons, triage rule issues with AI context, and recognize constructive local contributors.

The app is a Devvit-native port and product upgrade from an existing Reddit bot. It replaces external hosting, PRAW polling, legacy Reddit credentials, and file-based state with Devvit triggers, scheduler jobs, Redis, native Reddit permissions, and subreddit settings.

## Highlights

- AI TLDRs for long posts and comments.
- Reddit crosspost/link TLDRs for referenced Reddit threads.
- Milestone-based discussion summaries.
- Natural summon phrases like `hey bot`, `mod bot`, and `!bot`.
- AI moderation triage that automatically evaluates every new post/comment when enabled, with report, modmail, remove, or audit-only modes.
- AI contextual mod alerts for better moderator review.
- Safe mode defaults and Redis-backed audit logs.
- Local reputation flairs and specialist roles.

## Why moderators use it

Moderation load is often about context, not queue size. AI Mod Suite compresses long posts and busy threads into usable summaries, adds plain-language context to AI-flagged items, and lets communities test every workflow in safe mode before enabling live Reddit actions.

## Safety

- Safe mode defaults on.
- Live removal requires an explicit moderator-selected action mode.

## Links

- [Reddit Developer app listing](https://developers.reddit.com/apps/ai-mod-suite-bot)
- [Privacy Policy](/ai-mod-suite-devvit/privacy/)
- [Terms and Conditions](/ai-mod-suite-devvit/terms/)
- [GitHub repository](https://github.com/AccelerateToTheSingularity/ai-mod-suite-devvit)
