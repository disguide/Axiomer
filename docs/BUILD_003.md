# Axiomer 1.2.0 — build 003, 2026-10-27

This local continuation completes the existing value-first candidate; it does not restart upstream main. Source remains uncommitted on `feat/value-first-axiomer` over `47533dc28ba833c3bb5e1d662554a34ba6ef7997`. No push, deployment, real-provider inference or production database operation was performed.

## Result

- Attach titled sources with a URL and optional page/section to any thought. Links survive draft reload, graph export/import, immutable public revisions, proposed corrections and source-sensitive diff/rebase review. Source-only concurrent changes require explicit conflict choices. Sources provide inspectable references, not verification or a truth score.
- In editable whole-map overview, draw a valid connection between thoughts. Select a connection to edit its label or remove it without deleting thoughts; Undo restores it. Existing connection-picker authoring remains available. Shared readers can inspect relationships but cannot draw, drag or arrange the published graph.
- Reposition thoughts by dragging or contextual X/Y fields. Personal arrangement is view state saved per draft on the device; it never changes branch order, semantic history or shared graph JSON. **Arrange** restores the standard top-to-bottom reading layout and refits the viewport, including after a distant placement or pan.
- A view-only position save and an unchanged relationship save preserve pending AI review. Actual reasoning/source edits still invalidate stale suggestions. Arbitrary imported IDs such as `__proto__` and `constructor` remain supported through guarded position lookups.

The interface retains one expanded thought, optional labels, Continue/Add branch, overview/guided reading, AI Approve/Edit/Reject, immutable history and owner-reviewed corrections. It is not a general freehand ink editor. Manual layout is local-only; recipients get standardized automatic layout with the shared connections, evidence and reading order.

## Verification

Fresh checks against the final production code:

| Check | Observed result |
| --- | --- |
| TypeScript typecheck | Passed |
| Unit tests | 88 passed: existing graph/import/recovery/merge checks,16 evidence tests and2 arrangement/ID guards |
| Backend tests | 8 passed, including immutable source-bearing publication and source-only correction acceptance |
| Production build | Passed, lazy canvas bundle retained |
| Existing two-account browser suite | Passed: author/AI review, recovery, publication/corrections/history, stale updates, semantics, share links, mobile,502-node deep and202-node broad/converging maps |
| Whiteboard browser suite | Passed: real pointer connection, label/remove/Undo, evidence reload/public sharing, arrangement/pointer alternative, view-only/no-op queue retention, invalid-cycle rejection, far-layout/pan Arrange recovery, readonly overview, reserved IDs and mobile fit |
| `git diff --check`; server syntax | Passed |

Browser/API tests use in-memory or temporary SQLite and isolated synthetic accounts. The AI adapter is explicitly fixture-backed in automated checks; no live inference was performed. Screenshots were inspected at1440×1000 and390×844. These checks do not establish independent-reader comprehension, real-device gesture quality, frame-rate or public-service load limits. There is no Wikipedia-scale claim.

Build evidence and final code hashes are in [VERIFICATION_003.json](VERIFICATION_003.json). Curated screenshots: [evidence-linked map](evidence/build003/whiteboard-desktop.png), [mobile reader](evidence/build003/whiteboard-mobile.png), [deep map](evidence/build003/large-map.png), [broad map](evidence/build003/broad-map.png). Build002 remains historical in [BUILD_002.md](BUILD_002.md) and the original v2 export.

## Design basis and limits

The implementation adapts interaction mechanisms from [Obsidian Canvas](https://obsidian.md/help/plugins/canvas) and [React Flow connection validation](https://reactflow.dev/examples/interaction/validation), with [W3C dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) informing the existing connection picker and contextual coordinate inputs. No proprietary source/assets copied and no full WCAG compliance claim.

Source fields are additive to schema2; old absent/empty evidence remains compatible. Links allow only HTTP(S), reject embedded credentials and controls, and open with noopener/noreferrer. The server does not scrape or certify source URLs. Invalid submitted graphs return400 without altering immutable history. Sources are bounded metadata, not attachments/uploads.

Existing defaults remain defaults: AGPL code license separate from user content, SQLite accounts, public arguments/proposals and owner-only acceptance. Drafts and personal layouts are browser-local, not account-scoped/encrypted/cloud-synced. Real AI fidelity, unfamiliar-reader feedback, hosting/HTTPS, operational backups and unrestricted-public-registration readiness remain release work.
