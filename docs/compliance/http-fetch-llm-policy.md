# HTTP Fetch and LLM hostname policy — AI Mod Suite

**Sources:**

- [HTTP Fetch](https://developers.reddit.com/docs/capabilities/server/http-fetch)
- [Devvit LLM rules](devvit-llm-rules.md)

## Rules

1. Devvit apps may only `fetch` **HTTPS** URLs on hostnames listed in `devvit.json` `permissions.http.domains` (and globally allowed domains).
2. Entries must be **exact hostnames** — no wildcards, no paths, no `https://` prefix in config.
3. For **LLMs**, only **Google Gemini** and **OpenAI ChatGPT** are approved services ([Devvit Rules](https://developers.reddit.com/docs/devvit_rules#generative-aillm-rules)).

## Global allowlist (LLM-related)

From Reddit’s global fetch allowlist (verify on live docs before release):

| Hostname | Service |
|----------|---------|
| `generativelanguage.googleapis.com` | Google Gemini API |
| `api.openai.com` | OpenAI API (ChatGPT) |

AI Mod Suite declares **only** these domains in `devvit.json`.

## Prohibited

- DeepSeek, Kimi, Anthropic, Cohere, self-hosted, or proxy domains that forward to non-approved models
- Custom “base URL” or “bring your own LLM” settings
- Any hostname not approved in app review

## Request practices

- Send the **minimum** text needed for the feature (prompt + truncated post/comment).
- Do not send moderator secrets, API keys, or unrelated subreddit data.
- On LLM timeout or error: **no-op** — do not trigger destructive moderation actions.
- Default moderation posture: report/modmail/log unless moderators explicitly enable removal and disable safe mode.

## `devvit.json` configuration

```json
"http": {
  "domains": [
    "generativelanguage.googleapis.com",
    "api.openai.com"
  ]
}
```

When `llm_provider` is `gemini`, only the Gemini host is used. When `openai`, only `api.openai.com` is used.
