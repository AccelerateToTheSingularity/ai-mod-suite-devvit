# AI Mod Suite for Devvit

The swiss-army-knife of AI mod tools for Devvit. It handles what normally takes four separate bots (rule enforcement, summarization, community engagement, and contributor recognition) in a single open-source install with no server.

- **AI rule checks**: checks every new post and comment against the rules you write. Violations route to modqueue (report), mod inbox (modmail), or removal. Every flagged item includes an AI-written explanation: what rule matched, what happened, and what a human should verify.
- **Post and comment TLDRs**: long posts and comments get an AI summary automatically.
- **Reddit crosspost/link TLDRs**: when a post links to another Reddit thread, the app automatically summarizes the source.
- **Discussion digests**: milestone-based digest posted and updated as a thread grows.
- **AI summons**: `!bot`, `hey bot`, `mod bot` summons with bounded AI replies and optional follow-up conversations.
- **Reputation flairs**: contribution milestone flairs and AI-assigned specialist labels like `Resource Finder`.
- **Troll-alert modmail**: conservative early-warning modmail on low local scores.
- **Safe mode on by default**: dry-run everything before live writes. Redis-backed audit logs, duplicate prevention, cooldowns, and milestone state.

No server. No credentials. Install from the [app listing](https://developers.reddit.com/apps/ai-mod-suite-bot), configure from subreddit app settings.

## Why it matters

Moderation load is often about how much context each item needs, not just queue size. AI Mod Suite checks content against your rules, adds plain-language context on alerts, and summarizes long posts and busy threads so moderators and users spend less time reading and more time deciding.

## Safety model

- Safe mode defaults on.
- Live removal requires explicit moderator opt-in with safe mode off.
- Audit logs record proposed and completed actions.
- Redis idempotency prevents duplicate trigger actions.

## Stack

- Reddit Devvit
- TypeScript / Hono
- Devvit triggers and scheduler
- Redis
- Devvit Reddit API
- Google Gemini or OpenAI ChatGPT via API (moderator-configured)

## Public policy pages

- [Privacy Policy](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/privacy/)
- [Terms and Conditions](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/terms/)

Use these URLs in the Reddit Developer Portal app listing.

## Repository status

This repo is the **public GitHub Pages and release staging** home for AI Mod Suite. Published privacy and terms live under [`docs/`](docs/). Audited Devvit app source is imported from private development when ready; see [Publication Boundary](PUBLICATION_BOUNDARY.md) and [Release Checklist](RELEASE_CHECKLIST.md).

| Document | Description |
|----------|-------------|
| [Privacy Policy](docs/privacy.md) | Data handling and AI providers |
| [Terms](docs/terms.md) | Terms of use |
| [Release Checklist](RELEASE_CHECKLIST.md) | Pre-import and publish steps |
| [Publication Boundary](PUBLICATION_BOUNDARY.md) | What may not be published here |

## Demo

- Live judge/demo thread: [r/NetworkStates demo post](https://www.reddit.com/r/NetworkStates/comments/1toe0o9/ai_mod_suite_demo_thread_how_to_try_each_feature/)

## License

Licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

## Trademark and affiliation

**AI Mod Suite** is the project name for this software. Reddit, Devvit, and related marks are trademarks of their respective owners. This project is not affiliated with, endorsed by, or sponsored by Reddit, Inc.

Forks and derivatives are welcome under the license terms. Using the name "AI Mod Suite" for an unrelated competing product may confuse users; maintainers of forks are encouraged to use a distinct name if their app is not the same project.
