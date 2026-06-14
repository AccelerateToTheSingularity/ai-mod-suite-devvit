# AI Mod Suite for Devvit

The swiss-army-knife of AI mod tools for Devvit. It handles what normally takes four separate bots (rule enforcement, summarization, community engagement, and contributor recognition) in a single open-source install with no server.

- **AI rule checks**: checks every new post and comment against the rules you write. Violations route to modqueue (report), mod inbox (modmail), removal, or log-only. Every flagged item includes an AI-written explanation: what rule matched, what happened, and what a human should verify.
- **Post and comment TLDRs**: long posts and comments get an AI summary automatically when they cross a configurable word threshold.
- **Reddit crosspost/link TLDRs**: when a post links to or crossposts another Reddit thread, the app automatically summarizes the source thread.
- **Discussion digests**: milestone-based digest posted and updated as a thread grows (e.g. at 20, 50, 100 comments).
- **AI summons**: `!bot`, `hey bot`, `mod bot`, or `ai bot` summons with bounded AI replies and optional follow-up conversations.
- **Reputation flairs**: contribution milestone flairs and AI-assigned specialist labels like `Resource Finder` or `Frequent Answerer`.
- **Troll-alert modmail**: conservative early-warning modmail when local comment scores fall below a threshold (standalone; independent of the flair system).
- **Safe mode on by default**: dry-run everything before live writes. Redis-backed audit logs, duplicate prevention, cooldowns, and milestone state.

Moderation load is a combination of how big your queue is, and how much context each item requires. AI Mod Suite addresses both. Every item in a modqueue needs to be read, understood, and judged before you can act. AI Mod Suite makes that faster, easier and automated.

No server. Install from the [app listing](https://developers.reddit.com/apps/ai-mod-suite-bot), configure from subreddit app settings. All features are individually toggleable.

## Safety model

- Safe mode defaults on.
- Live removal requires explicit moderator opt-in with safe mode off.
- Audit logs record proposed and completed actions.
- Redis idempotency prevents duplicate trigger actions.

## Stack

- Reddit Devvit · TypeScript / Hono · Devvit triggers and scheduler · Redis · Devvit Reddit API
- Google Gemini or OpenAI ChatGPT via API (moderator-configured)

## Documentation

- [Build and develop](docs/BUILD.md)
- [Privacy Policy](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/privacy/)
- [Terms and Conditions](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/terms/)
- [Live demo thread](https://www.reddit.com/r/NetworkStates/comments/1toe0o9/ai_mod_suite_demo_thread_how_to_try_each_feature/)
- [Source repository](https://github.com/AccelerateToTheSingularity/ai-mod-suite-devvit)

## License

Licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

## Trademark and affiliation

**AI Mod Suite** is the project name for this software. Reddit, Devvit, and related marks are trademarks of their respective owners. This project is not affiliated with, endorsed by, or sponsored by Reddit, Inc.

Forks and derivatives are welcome under the license terms. Using the name "AI Mod Suite" for an unrelated competing product may confuse users; maintainers of forks are encouraged to use a distinct name if their app is not the same project.
