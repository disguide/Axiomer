# Antigravity handoff — 2026-11-06

Repository: https://github.com/disguide/Axiomer
Branch: `feat/value-first-axiomer`
Candidate: **Axiomer 1.2.1 / build004**, retained original React Flow implementation.

The drawing edition is a separate branch, `feat/tldraw-axiomer`, in the same repository. Use that branch for the user's latest tldraw direction. Do not combine the two clients or their dependency trees. The existing `main` and `codex/axiomer-rebuild` branches are independent; neither is this candidate.

## Start

Use Node **24.19+** and npm:

```sh
git clone --branch feat/value-first-axiomer https://github.com/disguide/Axiomer.git Axiomer
cd Axiomer
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run dev
```

Open http://127.0.0.1:5173. For a built local service, use `npm run build` then `npm start` (http://127.0.0.1:8787). Both UI and API are required. Configuration is documented in `.env.example`; do not put provider keys in Vite variables. The inherited main-branch viewer deployment workflow is historical and is not a deployment recipe for this server-backed candidate.

## Product and implementation

Value-first, freely branching reasoning maps with optional labels, evidence, readable paths, reviewed BYOK AI drafts, immutable history and owner-reviewed correction proposals. Continue reading `CLAUDE.md`, `client/src/roadmap/Workbench.tsx`, `model.ts`, `storage.ts` and `server/app.mjs`. Retained old modules/docs are historical unless current guidance explicitly references them. A well-structured argument is not proof of truth. AGPL applies to code; it does not assign a license to user content.

## Verification and remaining defects

Recorded build004 evidence: typecheck/build, 88 unit tests, 8 API tests, two-account browser, whiteboard and scoped UI checks passed; deep502/broad202 maps exercised. See `docs/BUILD_004.md` and `docs/VERIFICATION_004.json`. These are historical test receipts, not a fresh test run for this Git handoff.

November4 actual-app audit subsequently reproduced an original-client defect: after corrupt startup storage, new session work can be labelled saved yet disappear on reload. Mobile header actions also need accessible names and spacing. These remain open in this original branch; the drawing fork includes its own fixes. Live provider inference, real-device usability, human comprehension, deployment, backup/restore and operational readiness remain unverified.

Verification commands: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:server`, `npm run test:browser`, `npm run test:whiteboard`, `npm run test:ui`. Browser checks require Chromium; `CHROMIUM_PATH` selects its executable. Use disposable test databases.

## Working boundaries

Source and tests are included; local databases, accounts, browser drafts, provider keys, node_modules and dist are not. A fresh clone needs the install and build steps below. Existing accounts/publications require the matching private database; do not commit or upload it. Never reset a database to repair a UI. Local browser data does not transfer through GitHub.

Keep the interface simple, with clear actions and minimal explanatory copy. Preserve sources, user data and recovery behavior. AI suggestions require individual approval; publication and accepting a correction are separate decisions. This handoff is source access, not deployment or production-readiness certification. All scheduled discovery tasks were stopped at the user's request; do not recreate them.
