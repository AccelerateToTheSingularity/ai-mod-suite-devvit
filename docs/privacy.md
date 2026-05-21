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
- Direct summon replies (for example: "hey bot", "mod bot", "ai bot", or `!bot`)
- Comment-section discussion summaries
- AI-assisted moderation review or classification
- User flair or status commands
- Moderator audit logs and action history

## AI provider use

If AI features are enabled, selected post/comment text and relevant context may be sent to the **configured, Reddit-approved** AI provider for **inference only** (summarization, classification, or reply generation). The app does not use Reddit content to train or fine-tune machine learning models.

**Supported providers (moderator selects one):**

- **Google Gemini** — `generativelanguage.googleapis.com`
- **OpenAI ChatGPT** — `api.openai.com`

This app does **not** support other LLM vendors (such as DeepSeek, Kimi, or self-hosted models). Those are not permitted under [Reddit Devvit LLM rules](https://developers.reddit.com/docs/devvit_rules#generative-aillm-rules).

The installing moderator supplies the API key in app settings. The app does not collect Reddit passwords or legacy Reddit OAuth client secrets for Reddit actions.

## Data stored by the app

The app stores only operational data needed to run moderation features, such as:

- Subreddit settings
- Processed post/comment IDs (short-lived)
- Cooldown and rate-limit counters
- Daily action counters
- Audit log records (capped, short text snippets)
- Flair or status cache data where enabled

The app avoids storing full post/comment bodies except short, bounded audit snippets.

## Moderator control

Moderators control which features are enabled for their subreddit, which LLM provider is used, and which action modes are active.

**Safe Mode** defaults to **on** and is intended to prevent unexpected live moderation actions. Stronger actions, such as content removal, require explicit moderator configuration. Live bans are not supported.

## Data sharing

The app does not sell user data.

Data may be shared with the configured AI provider (Gemini or OpenAI only) when needed for enabled AI features.

## Contact

For questions or issues, contact the developer through the app listing or the moderation team of the subreddit where the app is installed.
