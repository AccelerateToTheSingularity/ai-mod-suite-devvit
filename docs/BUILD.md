# Build and develop

Prerequisites: Node.js 22+, npm, [Devvit CLI](https://developers.reddit.com/docs/quickstart) (`npm i -g devvit` or use `npx devvit`).

## Install dependencies

```bash
npm ci
```

## Build and type-check

```bash
npm run build
npm run type-check
```

## Local playtest (optional)

```bash
npx devvit login
npx devvit playtest
```

Use a test subreddit you moderate. Configure **General | Safe Mode** on before enabling live actions.

## Deploy

```bash
npx devvit upload
npx devvit install r/YOUR_SUBREDDIT
```

## Configuration

1. Install the app on your subreddit from the [app listing](https://developers.reddit.com/apps/ai-mod-suite-bot).
2. Open **Install Settings** on the app listing page.
3. Keep **General | Safe Mode** on (default) until you have verified behavior in the audit log.
4. Set **LLM | Provider** and **LLM | API Key** (Google Gemini or OpenAI ChatGPT).
5. Enable features individually (AI Moderation, TLDRs, Summons, Flairs, etc.).

HTTP allowlist: `generativelanguage.googleapis.com`, `api.openai.com` (see `devvit.json`).

## Legal

- [Privacy Policy](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/privacy/)
- [Terms](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/terms/)

## Demo

[Live demo thread](https://www.reddit.com/r/NetworkStates/comments/1toe0o9/ai_mod_suite_demo_thread_how_to_try_each_feature/)
