# Axiomer drawing fork — verification, 2026-11-06

Experimental local fork **1.3.0-tldraw.1**, branch `feat/tldraw-axiomer`, based on the actual uncommitted Axiomer1.2.1/build004 candidate. Original Axiomer remains unchanged. No GitHub fork/push/deployment is claimed. No other app was changed; scheduled tasks remain disabled.

## Editor and license

Uses the official original `@tldraw/tldraw@1.29.2`, whose shipped MITlicense was inspected and retained in docs/vendor. This is the older unmaintained v1 editor. Current tldraw 5.6 SDK has separate production licensing, so it was not imported. User's latest steering allowed direct source reuse rather than reverse engineering. No license checks were bypassed. React18.3.1 is used for this editor baseline; Axiomer contributions remain AGPL-3.0-only.200 production dependency license/notice files are retained in THIRD_PARTY_NOTICES.txt.

## What changed

- Replaced ReactFlow canvas with a native tldraw editor and a restrained named toolbar: select/move, pen, sticky note, rectangle, drawing arrow, Connect thoughts, drawing Undo/Redo, Zoom/Fit.
- Retained the Axiomer argument model and reader/editor/source/AI/history/correction flows. Native text edits update thoughts; explicit Connect thoughts uses validated DAGconnections. Decorative arrows/notes remain drawings, not automatically claims or reasons.
- Added a validated optional shared drawing layer. JSONimports/exports, publication/revisions and proposed corrections preserve it. Drawing-only changes appear in review with old/new previews and placed-thought coordinates. Concurrent drawing edits require an explicit choice of the whole drawing-plus-placement layer, not a claimed universal/per-object automatic merge.
- Drawing changes retain received pending AIreview. Native label+drawing callbacks merge against current state rather than overwrite each other. Thought positions now travel with the drawing layer; they remain separate from argument relationships/reading order.
- Draft/layout storage use fork-specific keys with a read-only fallback from legacy storage. Corrupt-startup work is explicitly unsaved; current-work and original-raw backups are separate, with guarded quarantine/recovery. Original keys are not overwritten.
- Named mobile actions and a wrapping header replace the clipped header. Native thought labels are bounded while full text stays in the focused pane. Routine editor feedback stays out of the main action flow.

## Fresh checks on this fork

- Production typecheck/build: passed. Vite reports a large lazily loaded editor chunk (about904kB minified,269kB gzip); this is not an optimization or loading-performance guarantee.
-103 unit tests passed, including original argument semantics and new drawing validation, import/export/review/atomic rebase and native projection cases.
-9 API tests passed in disposable memory/temp services: original revision/ownership/stale-base/migration/provider-fixture behavior, plus drawing-only publish/correction/immutable-old-revision preservation and unsafe drawing rejection.
- Actual system Chromium pointer/keyboard sessions: draw a pen stroke, create rectangle, Undo/Redo, reload drawings, edit a thought directly on canvas, add a validated reasoning connection, publish via a disposable account, and open its anonymous read-only view with drawings. No runtime page errors recorded.
- Deep 502-node and broad/converging 202-node datasets loaded and switched to focused reading, with stored totals preserved and no horizontal overflow. This is bounded functional evidence, not a performance/reader-comprehension guarantee.
- The previous corruption defect was checked in isolated storage: new work says Unsaved changes; recovery preserves the corrupt original/quarantine while saving/reloading the current draft. Final390px and1440px screens were captured and inspected; the final stroke survived reload.

Eight automated native browser checks pass (including immutable pen geometry and readonly Delete protection). Logs and detailed 97-event manual browser receipt are retained in the task directory. Existing legacy ReactFlow-selector browser suites were not claimed to pass on the new canvas. The first compile exposed typing/integration errors; they were corrected before the successful build. Initial overflowing native labels were corrected and visually rechecked.

## Practical limits

This remains an experimental fork. The legacy editor is not maintained upstream. No real-phone/Safari/assistive-technology/human-reader or deployment/load study was performed. The mobile whole-map overview is miniature; focus, search and zoom provide reading access. Live AI inference is unverified; tests use explicit fixtures and no real key. No real accounts/database/messages, billing or production publication were used.

Drawing-enabled schema2exports need this fork's matching UI/API. Older Axiomer clients may discard the drawing extension; no backward drawing round-trip promise is made. Newfork accepts old maps. Old publication/account identities require their matching service/database; these are not transplanted by a source fork. Drawing assets/images/groups/custommetadata and persistent nativebindings are intentionally unsupported; imported unsupported objects are rejected rather than silently accepted. Annotationlayer conflicts are atomic and explicit. Existing proposal structural conflicts may require manual reapplication.

Source and built UI are included in the portable bundle; dependencies, databases, credentials and git metadata are excluded. No original source or archive was overwritten. All temporary audit services were closed after testing.

## Screens

[Desktop](evidence/tldraw-fork/14-final-desktop.png) · [Mobile](evidence/tldraw-fork/15-final-mobile.png)
