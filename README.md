# AI Mod Suite for Devvit

AI Mod Suite is a Devvit-native Reddit moderation assistant for communities with long posts, busy comment sections, repeated explanation requests, and context-heavy moderation decisions.

It began as a port of an existing PRAW/Data API moderation bot and has been redesigned as an installable Devvit app: no custom bot hosting, no legacy Reddit credential management, no polling loop, and no file-based state jobs.

## What It Does

- Summarizes long posts and comments with configurable AI TLDRs.
- Optionally summarizes Reddit crossposts and reddit.com permalink posts by resolving source content through the Reddit API.
- Creates milestone-based discussion summaries for busy threads.
- Responds to direct community summons such as `hey bot`, `mod bot`, `ai bot`, and `!bot`.
- Supports optional bounded conversational follow-ups.
- Evaluates posts and comments against moderator-written rules.
- Lets moderators choose report, modmail, remove, or audit-only action modes.
- Adds AI contextual mod alerts that explain why an item needs review.
- Defaults to safe mode so communities can dry-run behavior before live writes.
- Tracks audit logs, idempotency, cooldowns, and milestones in Redis.
- Awards local reputation flairs and specialist roles from community contribution patterns.
- Sends conservative troll-alert modmail for strongly negative local participation patterns.

## Why It Matters

Moderators do not just need more automation. They need faster context, safer escalation, and tools they can trust.

AI Mod Suite reduces the reading burden around long content and busy threads, gives moderators clearer explanations for AI-flagged items, and helps communities recognize constructive participation. It is built for staged adoption: install the app, configure the features you want, run in safe mode, review the audit trail, then enable live actions only when your mod team is ready.

## Safety Model

- Safe mode defaults on.
- Live removal requires an explicit moderator-selected action mode.
- Live bans are not exposed.
- AI moderation separates detection from action execution.
- Audit logs record proposed and completed moderation activity.
- Redis idempotency prevents duplicate trigger actions.

## Stack

- Reddit Devvit
- TypeScript / Hono server bundle
- Devvit triggers and scheduler
- Redis
- Devvit Reddit API
- Google Gemini or OpenAI ChatGPT, configured by moderators

## Reddit Developer App

- App listing: https://developers.reddit.com/apps/ai-mod-suite-bot

## Current Status

This repository is the **public GitHub Pages and release staging repo** for AI Mod Suite. Published privacy and terms pages live here; the audited Devvit app source will be imported after private development and release review are complete.

This repo currently contains public documentation and policy pages. Runtime app code is developed in a private workspace and imported here only when ready for public release. See [Publication Boundary](PUBLICATION_BOUNDARY.md).

## Documentation

| Document | Description |
|----------|-------------|
| [Privacy Policy](docs/privacy.md) | How the app handles data and AI providers |
| [Terms and Conditions](docs/terms.md) | Terms of use for the app |
| [Release Checklist](RELEASE_CHECKLIST.md) | Steps before importing and publishing the finished app |
| [Publication Boundary](PUBLICATION_BOUNDARY.md) | What may and may not belong in this repo |

## Public Policy URLs

GitHub Pages (branch `main`, folder `/docs`):

- Privacy Policy: https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/privacy/
- Terms and Conditions: https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/terms/

Use these URLs in the Reddit Developer Portal app listing.

## GitHub Pages Setup

Repository Settings → Pages → Build and deployment

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/docs`
- **Save**

## License

License file will be added when the final app package is imported and audited.
