# AI Mod Suite for Devvit

AI-assisted Reddit moderation suite for TLDRs, summon replies, comment summaries, configurable moderation actions, audit logs, and safe-mode defaults.

## Current status

This repository is a **public-release staging repository**. The final Devvit app code will be imported here only after the private development build is complete and audited.

For now, this repo contains public documentation and policy pages required for Reddit Developer Platform review (privacy policy, terms, and release checklists). No app runtime code is present yet.

## Documentation

| Document | Description |
|----------|-------------|
| [Privacy Policy](docs/privacy.md) | How the app handles data and AI providers |
| [Terms and Conditions](docs/terms.md) | Terms of use for the app |
| [Release Checklist](RELEASE_CHECKLIST.md) | Steps before importing and publishing the finished app |
| [Publication Boundary](PUBLICATION_BOUNDARY.md) | What may and may not belong in this repo |

## Public policy URLs

Once GitHub Pages is enabled from `main` → `/docs`, the public URLs are:

- Privacy Policy: https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/privacy/
- Terms and Conditions: https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/terms/

These are the URLs to use in the Reddit Developer Portal.

## GitHub Pages setup

Repository Settings → Pages → Build and deployment

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/docs`
- **Save**

## License

License file will be added when the final app package is imported and audited.
