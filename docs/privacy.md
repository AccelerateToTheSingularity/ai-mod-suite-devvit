---
title: AI Mod Suite Privacy Policy
permalink: /privacy/
---

# AI Mod Suite Privacy Policy

Effective date: 2026-05-21

AI Mod Suite is a Reddit Developer Platform app for subreddit moderation assistance.

## What the app processes

When installed in a subreddit, the app may process Reddit posts, comments, usernames, subreddit names, post/comment IDs, moderation status, and related metadata as needed to provide moderation features.

Depending on moderator settings, the app may process content for:

- AI TLDR summaries of posts or comments
- Direct summon replies
- Comment-section summaries
- AI-assisted moderation review or classification
- User flair or status commands
- Moderator audit logs and action history

## AI provider use

If AI features are enabled, selected post/comment text and relevant context may be sent to the configured AI provider for summarization, classification, or reply generation.

The current intended provider is Google Gemini via `generativelanguage.googleapis.com`.

The app does not collect Reddit passwords or legacy Reddit OAuth client secrets for Reddit actions. Those credentials are not sent to AI providers.

## Data stored by the app

The app stores only operational data needed to run moderation features, such as:

- Subreddit settings
- Processed post/comment IDs
- Cooldown and rate-limit counters
- Daily action counters
- Audit log records
- Flair or status cache data where enabled

The app avoids storing full post/comment bodies except where temporarily necessary for debugging, audit, or moderation review.

## Moderator control

Moderators control which features are enabled for their subreddit and which action modes are active.

Safe Mode and conservative action modes are intended to prevent unexpected live moderation actions. Stronger actions, such as content removal, require explicit moderator configuration.

## Data sharing

The app does not sell user data.

Data may be shared with the configured AI provider only when needed for enabled AI features.

## Contact

For questions or issues, contact the developer through the app listing or the moderation team of the subreddit where the app is installed.
