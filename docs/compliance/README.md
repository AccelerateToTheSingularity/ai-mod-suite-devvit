# Compliance documentation

Reference material for Reddit Devvit app review, LLM use, and legal disclosures. **Not legal advice.** Official policies always govern; links below are the source of truth.

## Official Reddit policies

| Document | URL |
|----------|-----|
| Devvit Rules (incl. Generative AI/LLM rules) | https://developers.reddit.com/docs/devvit_rules |
| Devvit Rules — LLM section | https://developers.reddit.com/docs/devvit_rules#generative-aillm-rules |
| Reddit Developer Terms | https://redditinc.com/policies/developer-terms |
| Developer DPA | https://www.redditinc.com/policies/developer-dpa |
| HTTP Fetch (hostname allowlist) | https://developers.reddit.com/docs/capabilities/server/http-fetch |
| Reddit Privacy Policy | https://www.reddit.com/policies/privacy-policy |
| Reddit User Agreement | https://www.redditinc.com/policies/user-agreement |

## In-repo summaries

| File | Purpose |
|------|---------|
| [devvit-llm-rules.md](devvit-llm-rules.md) | Approved LLMs and Devvit LLM obligations |
| [reddit-developer-terms-summary.md](reddit-developer-terms-summary.md) | Developer Terms sections relevant to this app |
| [developer-dpa-summary.md](developer-dpa-summary.md) | DPA obligations for processing Reddit personal data |
| [http-fetch-llm-policy.md](http-fetch-llm-policy.md) | Allowed hostnames and fetch constraints |

## User-facing legal pages (GitHub Pages)

Privacy and terms are **not** uploaded with the Devvit app bundle. They live in this repo under `docs/` and are served by GitHub Pages. Enter these URLs in [Developer Platform app settings](https://developers.reddit.com/apps/ai-mod-suite-bot).

| Page | Public URL | Source file |
|------|------------|-------------|
| Privacy | https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/privacy/ | [docs/privacy.md](../privacy.md) |
| Terms | https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/terms/ | [docs/terms.md](../terms.md) |

After editing privacy or terms, push `main` and wait for Pages to redeploy before updating the app listing if URLs change.
