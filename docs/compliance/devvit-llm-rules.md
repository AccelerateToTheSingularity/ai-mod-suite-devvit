# Devvit Generative AI / LLM rules (summary)

**Source:** [Devvit Rules — Generative AI/LLM rules](https://developers.reddit.com/docs/devvit_rules#generative-aillm-rules)  
**Last synced for this repo:** May 2026 (verify against live docs before submission)

## Approved LLM services

Reddit permits Devvit apps to call **only** these LLM services via HTTP Fetch (subject to app review and the rules below):

1. **Google Gemini**
2. **OpenAI ChatGPT**

> For the avoidance of doubt, **self-hosted LLMs** (e.g. LLama, Mistral, Hugging Face) are **not** approved at this time.

**AI Mod Suite** is implemented to use **only** these providers. It does **not** support DeepSeek, Kimi, Anthropic, or other vendors.

## Requirements for apps using LLMs

Your Devvit app must:

1. **Provide significant and unique benefit** to Reddit users and communities through Reddit.
2. **Use an approved LLM** (Gemini or OpenAI ChatGPT only).
3. **Not use Reddit data** to create, improve, modify, train, fine-tune, or allow third parties to train/fine-tune any generative AI, LLM, ML, or NLP models using Reddit Data (except as Reddit permits separately in writing).
4. **Include terms of service and a privacy policy** for handling user data when using premium features such as fetch/LLMs.
5. **Adhere** to rate limits and guidelines in Reddit’s Developer Terms.

## App review

- Using **HTTP Fetch** and **LLMs** requires **prior app approval** for public listing and premium capabilities.
- Terms and privacy policy links must be accurate in app details.
- Exact fetch **hostnames** must be declared in `devvit.json`.

## AI Mod Suite implementation

| Rule | How we comply |
|------|----------------|
| Approved LLM only | `LLM \| Provider` install setting: `gemini` or `openai` only; optional mod-supplied API key; HTTP allowlist: `generativelanguage.googleapis.com`, `api.openai.com` |
| No training on Reddit data | Inference-only API calls; no datasets or fine-tuning; stated in [privacy policy](../legal/privacy-policy.md) |
| Terms + privacy | [terms-of-service.md](../legal/terms-of-service.md), [privacy-policy.md](../legal/privacy-policy.md) |
| Benefit | Moderator/community summaries, summons, triage, flair on installed subreddits |

Reddit may update approved LLMs at any time. Monitor the [official Devvit Rules](https://developers.reddit.com/docs/devvit_rules) before each release.
