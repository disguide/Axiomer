# Antigravity handoff — 2026-11-06

Repository: https://github.com/disguide/Axiomer
Branch: **`feat/tldraw-axiomer`**
Candidate: **Axiomer drawing edition 1.3.0-tldraw.1**. This is the user's latest requested drawing fork. The original React Flow candidate is preserved on `feat/value-first-axiomer`; `main` is older. This branch is not a separately created GitHub repository fork.

## Start

Use Node **24.19+** and npm:

```sh
git clone --branch feat/tldraw-axiomer https://github.com/disguide/Axiomer.git Axiomer-drawing
cd Axiomer-drawing
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run build
npm start
```

Open http://127.0.0.1:8787. Or use `npm run dev` for UI on5173 plus API on8787. A Git clone contains source, not the prebuilt dist from the portable zip. Choose a separate port/origin when running both Axiomer editions. The inherited main-branch viewer deployment workflow is historical and is not a deployment recipe for this server-backed app.

## Read and preserve

Start with `CLAUDE.md`, `docs/TLDRAW_FORK.md`, `docs/TLDRAW_VERIFICATION.md` and `docs/TLDRAW_AUDIT.md`. Current code is under `client/src/roadmap/` and `server/app.mjs`; older modules remain for reference and migration.

The editor is official **MIT tldraw v1.29.2**, an older unmaintained release, with React18.3.1. The current tldraw SDK has different production licensing; do not upgrade or strip licensing controls assuming identical terms. Keep AGPL and all `docs/vendor/` notices.

Drawing shapes and published thought positions are separate from canonical argument semantics. Decorative arrows do not create reasoning links. Sources, branching, reading order, individual AI approval, immutable revisions and explicit correction conflict choices must survive canvas changes. Concurrent drawing-layer edits require an explicit whole-layer choice. Older Axiomer clients may discard drawing extensions; do not promise roundtrip compatibility. Assets, groups and persistent native bindings are unsupported.

## Verification

Recorded fork checks: typecheck/build, **103 unit**, **9 API**, **8 native browser checks**, and a97-event desktop/mobile audit with0pageerrors. Published thought placement, drawing persistence, readonly protection, deep502/broad202 maps and corrupt-storage recovery were exercised. See the linked verification/evidence docs. No app behavior changed in this Git handoff; those receipts are not a new test run.

Use `npm run typecheck`, `npm test`, `npm run build`, `npm run test:server`, `npm run test:native`. Native browser checks require system Chromium (`CHROMIUM_PATH` override). Legacy React Flow selector suites (`test:browser`, `test:whiteboard`, `test:ui`) have not been adapted to the native editor and must not be reported passing here. Live AI inference, Safari, real phones, full accessibility, human comprehension and load/hosting readiness remain unverified.

## Working boundaries

Source and tests are included; local databases, accounts, browser drafts, provider keys, node_modules and dist are not. A fresh clone needs the install and build steps below. Existing accounts/publications require the matching private database; do not commit or upload it. Never reset a database to repair a UI. Local browser data does not transfer through GitHub.

Keep the interface simple, with clear actions and minimal explanatory copy. Preserve sources, user data and recovery behavior. AI suggestions require individual approval; publication and accepting a correction are separate decisions. This handoff is source access, not deployment or production-readiness certification. All scheduled discovery tasks were stopped at the user's request; do not recreate them.
