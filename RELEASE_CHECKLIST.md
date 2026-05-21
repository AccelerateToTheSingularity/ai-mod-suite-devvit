# Release Checklist

Use this checklist when the private Devvit app is complete and ready to import into this public-release staging repository.

## Before importing app code

- [ ] Confirm the private app build is complete.
- [ ] Confirm current app name/slug.
- [ ] Confirm Devvit upload succeeds.
- [ ] Confirm safe-mode baseline testing passes.
- [ ] Confirm no live ban automation is present.
- [ ] Confirm removal requires explicit moderator configuration.
- [ ] Confirm LLM/fetch hostnames match docs and `devvit.json`.

## Import app files

Copy only after the checks above pass. Expected files (adjust if the audited app differs):

- [ ] `devvit.json`
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `src/`
- [ ] Required config files
- [ ] Public README updates

## Public safety audit

Run from the repository root after import:

```powershell
git status --short
Get-ChildItem -Recurse -Force | Select-String -Pattern "GEMINI_API_KEY|API_KEY|SECRET|TOKEN|PASSWORD|client_secret|private bounty|Devpost|screenshot|\.eml"
```

Manual checks:

- [ ] No `.env` files are present.
- [ ] No private screenshots, messages, or emails are present.
- [ ] No bounty or submission drafts are present.
- [ ] No personal contact details are accidentally included.
- [ ] README and policy pages accurately describe the implemented app.

## GitHub Pages

- [ ] Enable GitHub Pages from `/docs`.
- [ ] Verify privacy URL loads.
- [ ] Verify terms URL loads.
- [ ] Put those URLs into Reddit Developer Portal.

## Reddit Developer Portal suggested values

Use after Pages is live (replace placeholders):

```text
Display name: AI Mod Suite
Description: AI-assisted moderation suite with TLDRs, summon replies, comment summaries, configurable mod actions, audit logs, and safe-mode defaults.
Terms and conditions: https://<github-username>.github.io/<repo-name>/terms/
Privacy policy: https://<github-username>.github.io/<repo-name>/privacy/
```
