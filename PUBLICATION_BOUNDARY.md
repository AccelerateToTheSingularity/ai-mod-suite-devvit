# Publication Boundary

This repo may become public. Only public-safe app files and public review/support documents belong here.

## Allowed (now or later)

- Finished Devvit app source
- `devvit.json`
- `package.json`
- Public README
- Public docs
- Privacy policy
- Terms
- License
- Public screenshots only after review

## Never allowed

- `.env` files
- API keys
- Gemini keys
- Reddit credentials
- Private bounty notes
- Devpost drafts
- Private screenshots
- Reddit private messages
- Emails
- Personal notes
- Raw audit documents containing private context
- Copied private workspace history

## Import rule

The final app should be copied into this repo only after the private development workspace has passed build, test, safe-mode, and public-release audits.

## Source workspaces (do not copy from here)

The following locations are **not** sources for direct copy into this repo:

| Location | Role |
|----------|------|
| Private bounty/planning workspace | Planning, strategy, submission drafts — never publish |
| Private Devvit development app | Active development — import only after audit |
| Legacy Python/PRAW reference bot | Historical reference — not part of this release |

When importing later, copy only audited, public-safe artifacts from the finished Devvit build. Do not bulk-copy directories from private workspaces.
