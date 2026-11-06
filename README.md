# Axiomer

**GitHub source handoff:** see [Antigravity setup, branch and known limits](docs/ANTIGRAVITY_HANDOFF.md).

Make your reasoning easy to follow and share. Start with a value, write the next reason, and branch when your reasoning takes different paths. A reader can explore the whole map or follow one thought at a time.

This working branch contains the value-first Axiomer candidate (1.2.1), with evidence-linked reasoning, direct canvas authoring and a focused UI/UX pass. It is a local release candidate, not a deployed service.

## Run

Requires **Node 24.19+** (native TypeScript stripping and SQLite) and npm.

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run dev
```

Open http://127.0.0.1:5173. The development command starts both Vite and the API. Or serve the production build:

```bash
npm run build
npm start
```

Open http://127.0.0.1:8787. Do not use `vite preview` for publishing or AI; those require the API. The old `build:viewer` flag is no longer a separate static viewer mode.

## Included

- Optional labels, multiple branches and shared steps; one starting value and no circular reading paths.
- Whole-map overview, explicit Zoom/Fit controls, compact local focus, guided Back/Next and search. Fit and repeated Whole map recover the exposed canvas without changing graph or personal arrangement. The global layout is preserved while focus arranges immediate neighbors for reading.
- Directly connect thoughts in whole-map overview, edit relationship labels and remove connections without deleting thoughts. Drag a thought or use its contextual position fields; **Arrange** restores the automatic reading layout and brings it back into view.
- Attach titled HTTP(S) sources and optional page/section references to a thought. Sources survive drafts, export/import, published revisions and correction review. A citation is not a truth verdict.
- Device-local draft library, portable JSON export/import, legacy graph import and undo.
- AI-assisted drafting through OpenAI or Anthropic using your API key. Every proposed thought and its parent connection requires approval; edit or reject each suggestion. Rejected dependencies are skipped. Approved and pending steps recover together after reload.
- Public argument pages, account ownership, immutable revisions and proposed corrections. Reviews show node edits, relationship labels, retained original semantics and changed branch reading order.
- Updated correction proposals: compare with the latest argument, combine independent changes, choose conflicting versions explicitly, save a private draft and submit it for owner approval. Earlier proposals stay in history. Invalid graph combinations are blocked; a manual-reapply route preserves the original proposal.
- Explicit **Latest version** and **This published revision** share links. Submission explains that proposals are publicly readable; private draft edits are never included in a published link.
- A quick thought editor keeps Save visible, with optional label, sources, personal position and connections in expandable sections. Global Map actions remain separate.
- Responsive layout, keyboard-accessible controls, modal focus trapping including disclosure summaries, and reduced-motion support.

## Data and privacy

Manual canvas arrangements are device-local view state, separate from argument meaning and reading order. They are not included in shared revisions or graph JSON exports; recipients get the standard automatic layout. View-only changes keep pending AI reviews.

Drafts use browser storage, without an account. They are private to the device/browser profile, **not encrypted** or account-scoped. Export important work. Earlier Axiomer storage keys are untouched; choose **Import earlier Axiomer maps** in Library. Malformed storage is preserved for recovery. Unsupported cyclic legacy graphs require manual migration; the original is not modified.

Published arguments and proposals are public on your service. Accounts and revisions use SQLite at `.data/axiomer.sqlite`. Passwords are scrypt-hashed and session tokens are hashed at rest. Back up the SQLite database with a consistent SQLite backup procedure; do not copy a live database while ignoring its WAL.

AI keys stay in page memory, pass through the Axiomer API for the current request, and are not saved in drafts or the database. Closing/reloading the page clears them. Explanation and bounded map context go to the chosen provider. Provider inference can cost money; manual authoring and self-hosting have no application subscription fee.

For hosting, set `APP_ORIGIN` to your exact HTTPS origin, `COOKIE_SECURE=1`, `HOST=0.0.0.0`, and persist `DATABASE_PATH`. See `.env.example`. The server reads environment variables directly; use your process manager or `node --env-file=.env server/app.mjs`. No deployment has been performed.

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run test:server
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
CHROMIUM_PATH=/usr/bin/chromium npm run test:whiteboard
CHROMIUM_PATH=/usr/bin/chromium npm run test:ui
```

Browser tests use a disposable SQLite database and two isolated browser contexts. The AI provider is explicitly replaced by a contract fixture. No live provider inference was tested without credentials. Evidence and remaining limits are in [docs/RELEASE_CANDIDATE.md](docs/RELEASE_CANDIDATE.md).

## Scale and current limits

The model accepts up to 20,000 nodes / 60,000 connections as defensive import limits, not a performance promise. Tests exercise a 2,000-step model, a 502-node deep browser map and a 202-node broad map with shared reasoning. **Wikipedia-scale storage, indexing, partitioned loading and collaborative editing are not implemented.** Current publishing stores full snapshots, and public discovery returns a bounded list.

This candidate has no password recovery, email verification, moderation/reporting, account deletion interface, private remote maps or live multiplayer editing. Those are release work before running an unrestricted public community. Proposal updates merge items into a private draft; conflicts require choices and owner acceptance remains separate. Structural combinations that form a cycle or leave missing references require manual reapplication. Invalid/unsupported AI responses leave the graph unchanged. The interface helps show reasoning; it does not establish truth or score a person.

## Source and license

Code is licensed under [AGPL-3.0-only](LICENSE). This does not assign that license to user-authored argument content. The original upstream is https://github.com/disguide/Axiomer; this working branch has not been pushed there. Legacy product documents are historical where they conflict with this README and [CLAUDE.md](CLAUDE.md).
