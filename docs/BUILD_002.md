# Build 002 — clearer sharing and correction updates

Version 1.1.0, 2026-10-20. User instruction: “Let’s just continue and build axiomer”. This continues the existing `feat/value-first-axiomer` working tree over base `47533dc28ba833c3bb5e1d662554a34ba6ef7997`. Changes remain local/uncommitted; no source push or deployment. Ethereon and Colab Calendar were not changed.

## Changes

- Correction review displays relationship labels, original imported semantics and direction, changed branch reading order, and old/new starting values. Semantic-only changes are no longer invisible. Recreated connection IDs alone do not count as a meaningful correction.
- A contributor can open a pending proposal, compare it with the latest publication, combine changes to different items, explicitly choose between conflicting thoughts/connections/starting points/reading orders, and prepare a private updated draft. Every conflict starts unanswered. Merged graphs must validate; broken links and cycles are never silently pruned.
- Preparing a draft does not change the publication or original proposal. Explicit submission creates a new linked proposal and marks the previous one superseded. Only its author can update it, and the submitted update must use the current published version. Accepting the new proposal is a separate owner action. Earlier proposal graphs and explanations remain readable.
- An invalid combination offers a manual-reapply route from the latest map. This is intentionally conservative, not a universal automatic merge. The original proposal stays available.
- Proposal submission states that its text and graph are public. Share tools separately offer a **Latest version** link and a **This published revision** link, including when reading older history. Private edits are excluded from those links.
- Saved work resumes its active draft and update provenance, even if another draft has an AI queue.
- Follow a path lays out and fits its immediate neighborhood locally; Whole map retains the global layout. A shared conclusion's parents are no longer stranded at their far-away global coordinates during focus reading.
- Import/save feedback no longer intercepts clicks on map navigation; desktop toasts sit above the controls and only their dismiss button captures input.
- SQLite migration adds nullable `supersedes`/`superseded_by` columns without deleting existing accounts/proposals/history. Migration/reopen checks use a disposable legacy database.

## Validation

The current candidate uses Node24.19+, React/TypeScript/Vite and native SQLite. Meaningful checks include:

- 70 unit tests: original 52, initial roadmap/storage 10, and 8 correction/recovery tests. Coverage includes semantic-only edits, branch order, explicit conflict choices, concurrent additions, delete-versus-edit, invalid combinations, no input mutation and active-draft recovery.
- 7 backend tests: existing ownership/history/provider contracts plus proposal supersession, author-only updating, stale-base protection, original history preservation, meaningful-change validation and additive migration/reopening.
- Chromium in two isolated contexts: initial authoring/AI-review flows, reader correction/owner acceptance, conflicting stale update, no preselected resolution, draft reload, superseded history, relationship-only review and explicit latest/pinned links. Mobile sharing uses a 390×844 touch viewport; desktop 1440×1000. Provider output is an explicit fixture.
- Graph datasets: a 502-node deep map, a 202-node map with 200 branches and a shared conclusion (10 parents), plus the existing 2,000-node model case. Focus checks distinguish the actual local nodes from unrelated globally nearby nodes.

Typecheck, 70 unit tests, 7 backend tests, production build, the complete browser suite, `git diff --check` and `node --check server/app.mjs` passed. Screenshots were inspected and copied into docs/evidence; details are in RELEASE_CANDIDATE.md. These functional checks do not establish general performance, real-device gesture behavior, reader comprehension or Wikipedia-scale support.

## Remaining limits

No live-provider inference was performed; keys belong in the app. Public hosting/domain and persistent storage remain unconfigured. The existing account-recovery/moderation/account-lifecycle/private-remote-map limitations remain. Rebase resolution chooses a whole item, rather than independently merging every field of a thought; a person can edit the prepared private draft before submitting. Concurrent additions to the same branching point may require an explicit reading-order choice. Structurally incompatible combinations require manual reapplication.
