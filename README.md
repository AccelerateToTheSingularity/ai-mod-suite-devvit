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

## GitHub Pages setup

To host the policy pages for Reddit Developer Platform review:

1. Open the repository on GitHub → **Settings** → **Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main`
4. **Folder:** `/docs`

After deployment, the policy URLs should resolve to:

- `https://<github-username>.github.io/<repo-name>/privacy/`
- `https://<github-username>.github.io/<repo-name>/terms/`

Use these URLs in the Reddit Developer Portal when submitting the app.

## License

License file will be added when the final app package is imported and audited.
