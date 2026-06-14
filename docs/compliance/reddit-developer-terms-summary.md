# Reddit Developer Terms — summary for AI Mod Suite

**Source:** [Reddit Developer Terms](https://redditinc.com/policies/developer-terms) (effective September 24, 2024; last revised March 24, 2026)  
**Also applies:** [Reddit User Agreement](https://www.redditinc.com/policies/user-agreement), [Developer DPA](developer-dpa-summary.md)

This document summarizes provisions that matter for the **AI Mod Suite** Devvit app (`ai-mod-suite-bot`). It does not replace the official terms.

## What this app is

- A **Devvit App** hosted on Reddit’s Developer Platform.
- Installed by **moderators** on subreddits they manage.
- Uses Devvit **Reddit APIs**, **Redis**, and **HTTP Fetch** to approved LLM hosts only.

## Sections most relevant to AI Mod Suite

### 1. Registration and access

- Use only Reddit-authorized **Access Info** (Devvit app credentials); do not share secrets publicly.
- Keep app registration information accurate.

### 2. License and use of Developer Services

- Use Reddit Services and Data only as permitted by the Developer Terms and Documentation.
- **User Content** may be displayed and formatted for the app’s functionality; do not use User Content to **train** ML/LLM models without permission (see §4.2, §5.2).

### 3. Your App

- **App Review:** Devvit apps may require Reddit review before broad distribution; cooperate with review requests.
- **App Users** must comply with the User Agreement; your terms cannot conflict with Reddit’s terms.
- **Content removal:** Honor Reddit and user content removal processes.
- **Devvit Apps:** Reddit may host, run, and sublicense your app to operate the platform; moderators may retain access for a transition period after termination.

### 4. Restrictions

- **§4.2 — No training:** Do not use Reddit Services and Data to train LLMs or algorithmic models without Reddit’s permission. AI Mod Suite uses LLMs for **real-time inference only** (summaries, classification, replies).
- **§4.2 — Other:** No spam, circumvention of rate limits, security interference, or law-enforcement/surveillance misuse.
- **§4.1 — Commercial:** Do not sell or monetize Reddit data; this app is a mod utility, not a data product.

### 5. Intellectual property

- **User Content** belongs to users; provide attribution/links per Brand Guidelines when displaying content.
- Do not imply Reddit endorsement without approval.

### 7. Privacy and security

- Comply with the **[Developer DPA](https://www.redditinc.com/policies/developer-dpa)** and applicable privacy laws.
- Maintain a **privacy policy** describing collection, use, storage, sharing, and deletion — see [privacy policy](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/privacy/).
- **Data sharing:** Do not share Reddit data with third parties except as permitted (e.g. approved LLM inference under the privacy policy).
- **Retention:** Delete Reddit data when no longer needed for stated functionality, on Reddit/user request, or when required by law — see privacy policy retention table.
- **Security:** Protect Access Info; use reasonable safeguards; notify Reddit of security incidents affecting Reddit data.

### 8–10. Termination, liability, miscellaneous

- Reddit may suspend or terminate access; you must stop using Reddit materials and delete retained data as required.
- Developer Terms may change; continued use after changes constitutes acceptance.

## AI Mod Suite alignment

| Topic | Alignment |
|-------|-----------|
| Devvit-only Reddit actions | Yes — no legacy Reddit password OAuth in this port |
| LLM training | No training pipeline; inference only |
| Privacy policy / terms | [Privacy](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/privacy/), [Terms](https://acceleratetothesingularity.github.io/ai-mod-suite-devvit/terms/) |
| Moderator scope | `devvit.json` reddit permission scope: moderator |
| Safe defaults | `safe_mode` default on; report/modmail/log by default; removal explicit |

For submission, read the full [Developer Terms](https://redditinc.com/policies/developer-terms) and ensure app listing URLs match published legal pages.
