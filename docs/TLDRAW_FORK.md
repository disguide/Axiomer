# Axiomer drawing fork

This experimental fork continues the exact local Axiomer1.2.1/build004 candidate. The original /workspace/Axiomer and all previous exports remain separate. This folder has no push remote configured; no GitHub fork, deployment or original-repository push is implied.

The canvas uses the original official MIT-licensed tldraw v1 release1.29.2. It is older and no longer maintained upstream; current tldraw SDK production licensing is different. MIT attribution is retained under docs/vendor. Axiomer contributions remain AGPL-3.0-only.

Thoughts, values, sources, relationships and argument approvals remain the Axiomer domain model. Freehand marks and other decorative objects are not automatically claims or reasoning links. Publication and correction acceptance remain explicit. Placed thought coordinates travel with the drawing layer while argument relationships/reading order remain separate. Drawing changes require this fork's matching UI/API; an older Axiomer client does not promise to retain the new drawing extension.

Drafts use axiomer.tldraw.roadmaps.v1; arrangement uses axiomer.tldraw.arrangements.v1. Existing legacy keys may be read as a migration source, but are not overwritten. Use a different origin/port for the fork when testing. No real user database is bundled.

Local development and build follow README; npm ci, npm run build, then npm start with Node24+. A memory-only service is used for validation. Actual verification/results and limitations will be added after the new canvas is exercised. No real AI inference or key is included. Scheduled tasks remain disabled.
