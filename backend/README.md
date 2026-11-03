# AI Character → native V6B backend setup

This is a private **authoring** API, not a public unrestricted image-generation endpoint.
The Mahluk Hidup website stays on GitHub Pages; this small Cloudflare Worker securely
calls the OpenAI API and GitHub Actions.

## What this actually generates

- An AI model reads the typed prompt and reference photos, producing a **restricted V6B config**.
- GitHub Actions runs the repository's **existing `npc_v6b.py` renderer**.
- All native animation rows (walk, idle, talk, sit, sleep, etc.), 4 views and expression overlays are generated.
- The result is pushed to a **draft review branch** and an **unmerged pull request**.
- After you visually approve and merge the PR, the existing Character Stock build can publish it.
- This is native V6B, but the AI **does not automatically write novel hairstyles/facial geometry** as the hand-authored Aladdin Sane script did. Unsupported visual details are listed in the generated spec for manual editing.
- The base preview shown in the form is taken directly from the existing Human Male / Female sprite sheets. Only those two bases are currently eligible for automatic draft generation. Astrofrich is preview-only pending a renderer-specific adapter.

## 1. GitHub token (one-time, owner action)

At github.com/settings/personal-access-tokens create a **Fine-grained personal access token**:
- Repository: `lafrich/virtual-life-asset-pipeline`
- Repository permissions: **Actions Read & Write** (dispatch) and **Pull requests Read** (review status).
- Restrict access to this repository, give it an expiry, copy the token securely.

In the repository:
Settings → Actions → General → Workflow permissions → choose **Read and write permissions**.
Enable **Allow GitHub Actions to create and approve pull requests** if available.
The draft workflow needs `contents: write` and `pull-requests: write`, and never automatically merges.

## 2. OpenAI API key (one-time, owner action)

Create an API key in the OpenAI API platform (API billing is separate from ChatGPT).
Do NOT paste it in chat, commit it to GitHub, put it in client JavaScript, or store it in
the browser. References are sent only to this AI API, not saved to the public GitHub repo.

## 3. Cloudflare account → Worker

Install Node.js locally and, from the repository root, open a terminal:

```bash
cd backend
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GH_DISPATCH_TOKEN
npx wrangler secret put STUDIO_PASSCODE
npx wrangler deploy
```

Choose a strong unique passcode and keep it private. Never use your GitHub password.
Each `secret put` prompts you to paste the value securely. Wrangler will show your Worker
URL, e.g. `https://mahluk-hidup-ai-gateway.YOUR-SUBDOMAIN.workers.dev`.

Cloudflare Pages / Workers can also be deployed with GitHub integration; the
`wrangler.toml` provided here is configured for the `backend/` directory.

## 4. Connect the Mahluk Hidup UI

Open `https://lafrich.github.io/virtual-life-asset-pipeline/ai-character.html`.

- The four-direction default preview **is an actual native V6B base**.
- Paste your Worker URL into **Backend URL** (the URL is saved locally).
- Enter your personal studio passcode when submitting; it is NOT saved in browser storage.
- Type a character name/prompt and optionally attach photo references.
- Choose **Human Male** or **Human Female**, press **Generate Native V6B Draft**.
- The Worker returns the GitHub Actions run and a request ID.
- The UI monitors the draft pull request, then links to the review. The source images are never sent to GitHub.
- Merge **only after inspecting** source sprites in the draft's GitHub files / preview.
- The main Character Stock deploy will then include the approved asset; Semesta can sync the published actor.

## Important limitations

- The API is **not deployed** until you complete the account/login/secret steps.
- GitHub Pages alone cannot hold server credentials or invoke Python securely.
- A private passcode restricts requests, but for a production multi-user app
  add real user authentication, usage quotas, spending limits and monitoring.
- The current V6B configuration renderer cannot produce entirely novel hand-sculpted
  forms. Special assets need a separate AI coding agent with reviewed PRs,
  and must not execute untrusted arbitrary generated Python with secrets.
- Public GitHub PRs disclose character names, sprite assets and any short
  text notes generated into the spec. Uploaded photos are **not** checked in.
- Only authored/tested actions should be labeled playable in Semesta.
