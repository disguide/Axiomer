# Axiomer 1.2.1 — UI/UX build 004, 2026-10-29

A focused UI/UX continuation of the existing candidate, local/uncommitted on `feat/value-first-axiomer` over `47533dc28ba833c3bb5e1d662554a34ba6ef7997`. No push, deployment, provider inference or real database change.

## What changed

- Clearer, larger selected-thought actions, reading choices and map-card text preserve the ivory/forest visual identity and one expanded thought.
- Explicit Zoom out, Fit and Zoom in controls recover the exposed canvas. Repeated Whole map deliberately refits. Framing excludes the right/bottom thought panel and leaves space for search and view controls. Fit never rearranges or saves the graph; manual view actions cancel queued automatic framing. Readonly readers get these view controls without editing rights.
- Edit thought is a short, text-first form. Save stays visible while optional label, sources, device position and connection actions expand independently. Collapsed values remain intact; invalid hidden source fields reopen their section. Global Map actions has Undo/export/history/proposal/share access, separate from thought editing.
- Dialog keyboard traversal includes disclosure summaries and excludes hidden fields. Escape closes and focus returns. Narrow-desktop search and zoom controls no longer overlap.

Free branching, coherent chosen paths, meaningful original edge semantics, evidence links, optional labels, Continue/Add branch, per-node AI approval, immutable history and owner-reviewed corrections are preserved. A no-op or position-only save retains pending AI review. No data schema, backend, dependencies, import/export meaning or license changes were introduced by this UI pass.

## Verification

| Check | Result |
| --- | --- |
| Typecheck and production build | Passed |
| Unit tests | 88 passed |
| Backend tests | 8 passed |
| Two-account browser workflows | Passed, including AI fixtures/recovery, publication/PR/history, mobile, 502-node deep and 202-node broad/converging maps |
| Whiteboard browser suite | Passed: sources, pointer connections, labels/remove/Undo, drag/numeric layout, queue preservation, cycles, distant Arrange recovery, readonly and reserved IDs |
| New UI/UX browser suite | Passed: mobile Save, closed/open disclosures and focus wrapping, hidden invalid source recovery, unchanged source/kind/layout/queue, native pointer Zoom/Fit/repeated Whole map, focused zoom persistence, exposed framing, 800px no-overlap, readonly view controls |
| Fresh screenshots | Eight desktop/mobile flows, 1440×1000 and 390×844, visually inspected; extra 800px selected-panel check |
| Git diff whitespace and server syntax | Passed |

Checks use isolated browser profiles and in-memory/temporary SQLite. The existing historical `.data` directory was left untouched. Automated AI uses explicit fixtures, not real inference. No claim of real-user comprehension, full accessibility, real-phone gesture quality, frame rate, public-service load or Wikipedia scale.

The new native-pointer check caught the initial viewport panel behind React Flow's canvas hit layer; the panel stacking was fixed. Mobile framing initially placed a card under search; fixed pixel insets and competing overview-centering removal corrected it. An early harness used unsupported Shift+Tab shorthand, and premature responsive Fit assertions were changed to wait for a stable actual viewport. The whiteboard pointer test now waits for post-Undo layout settlement before measuring the drag start. Failed-run logs remain in the task research; only final passing evidence is curated here.

Current source/dist/evidence hashes: [VERIFICATION_004.json](VERIFICATION_004.json). [Build003](BUILD_003.md) remains the historical evidence/whiteboard baseline. See [RELEASE_CANDIDATE.md](RELEASE_CANDIDATE.md) for remaining real-AI, reader-feedback, hosting/HTTPS and public-service operational work. This bundle is runnable locally; it does not create a public phone URL.
