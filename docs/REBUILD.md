# Axiomer v2

This is the implementation guide for the new workspace at `/`. It supersedes the older product model. The earlier editor remains at `/legacy`.

## Product and structure

Statements are questions or claims. Sources carry an original URL, title, publisher, relevant explanation/excerpt, and passage locator. Meaning belongs to the connection: **supports, challenges, context, source**. One node can be reused in different roles. Sources are user-entered and are not automatically fetched or verified.

The Map shows one node and its immediate neighbors. Read shows the same data with explanations. Exploring a node requests another neighborhood. Neither mode lays out or recursively traverses the entire corpus. There is no required philosophical taxonomy or automatic truth score.

| Location | Responsibility |
| --- | --- |
| `client/src/atlas/Workspace.tsx` | Workspace, Map/Read, search, sources, edits and review |
| `client/src/atlas/model.ts` | Shared node, connection, page and proposal contracts |
| `client/src/atlas/agent-contract.ts` | Shared tool definitions |
| `server/repository.ts` | Prepared SQL, atomic mutations, revisions and proposals |
| `server/api.ts` | JSON transport and request validation |
| `server/import.ts` | Separate-map migration and raw input backup |
| `server/local-database.ts` | D1-shaped adapter for Node SQLite |
| `server/dev.ts` | Local migrations and loopback HTTP server |
| `server/worker.ts` | Hosted API and static assets |
| `db/schema.ts`, `drizzle/` | Schema and generated/schema-only custom migrations |
| `scripts/mcp.mjs` | MCP stdio bridge to the persistent API |

Hosted and local databases are separate. Only labeled, bundled examples are seeded on a new deployment. Local knowledge is not uploaded. Runtime code never creates or alters production tables; Sites applies migrations before Worker publication. Transactional counters have a one-time initialization marker.

## API

Responses use `no-store`. Errors return `{ error }`. SQL parameters are bound; text lengths, HTTP(S) source URLs, and page bounds are validated. Mutations require JSON and reject a different browser Origin.

| Method and path | Result |
| --- | --- |
| `GET /api/overview` | Maintained totals and top 100 topics |
| `GET /api/nodes?q=&topic=&kind=&cursor=&limit=` | Search/list pages |
| `GET /api/nodes/:id?relation=&cursor=&limit=` | One-hop neighborhood, relationship totals, first backlink page |
| `GET /api/nodes/:id?direction=parents&cursor=&limit=` | Incoming uses; continue with `parentsNextCursor` |
| `POST /api/nodes` | Create `{ draft, parent?, relation? }` |
| `PATCH /api/nodes/:id` | Edit `{ draft, version }`; retain old content |
| `POST /api/connections` | Reuse `{ parent, child, relation }`; duplicate calls are idempotent |
| `DELETE /api/connections/:id` | Unlink only; send JSON `{}` |
| `GET /api/nodes/:id/history` | Latest 30 earlier content versions |
| `POST /api/import` | Atomic JSON import; returns new root ID |
| `GET /api/imports/:rootId` | Exact original imported JSON |
| `GET /api/proposals?cursor=&limit=` | Pending proposals |
| `POST /api/proposals` | Stage `{ parent, baseVersion, relation, draft, rationale }` |
| `POST /api/proposals/:id` | Review `{ accept: boolean }` |
| `GET /api/agent-tools` | Tool definitions |
| `POST /api/agent-call` | Execute `{ name, arguments }` |

Pages default to 30, maximum 100. The UI initially requests 60 connections and 20 backlinks. Follow the returned cursor with the same query/filter/direction. Full-text search orders by indexed row ID, not relevance, avoiding a full materialization and sort of matching IDs. Query tokens are quoted before FTS matching. Corpus lists use stable ID keysets.

Edits use optimistic concurrency. Proposal acceptance conditionally inserts the node and edge, accepts the proposal, and increments the parent version in one transaction. Concurrent acceptance cannot apply twice. A stale version returns 409. Unlink does not delete either node. Cycles are representable because traversal is always one hop.

## Agents and access

The stdio bridge forwards requests to the same API/database as the UI; no full graph JSON is needed. Browser WebMCP shares the tool contract, is feature-detected, and unregisters via AbortSignal. No language model API or background autonomous agent is configured.

This deployment is **owner-private**. Sites must protect the app and `/api/*`. The application has no multi-user identity or role model: a holder of the owner's session can use direct editing and review endpoints. The three exposed agent tools stage new content, but this is a tool-interface contract, not an authorization sandbox. Origin checks are not authentication. Do not open shared/public access until reader/contributor/reviewer authorization is implemented. This release does not issue independent agent API keys.

## Preservation

Old browser storage is untouched. Legacy routes and compressed links remain. Legacy JSON validation preserves source URL, verification flag, and finite coordinates. Import normalizes legacy edge directions and retains the exact original including unknown metadata. Imported IDs are remapped so imports cannot overwrite existing knowledge; shared nodes remain shared within the imported map. Cross-import deduplication uses **Use existing**.

Import limits are 200 nodes, 500 edges, and 100 KB per transaction. Export is the displayed neighborhood, not a corpus backup. Large production imports/backups need database tooling or a reviewed ingestion service.

## Scaling path

Implemented: indexed node/edge tables, stable IDs, FTS5 with incremental triggers, keyset pagination in both adjacency directions, transactional aggregate/topic counters, bounded responses, optimistic edits, reusable sources, and atomic proposal acceptance.

The test fixture contains 100,014 nodes and a 10,006-edge hub. A 40-neighbor response is under 12 KB for that fixture. This local synthetic benchmark is **not** a production capacity guarantee.

A single D1 database has a documented size ceiling, currently up to 10 GB on the paid platform. Before reaching that limit, partition topic collections behind the repository interface, retain global IDs, add a cross-shard adjacency directory and search service, and choose an explicit consistency model. These distributed pieces are not implemented. References: [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [SQLite FTS5](https://www.sqlite.org/fts5.html).

Before Wikipedia-scale public operation, add roles, contribution attribution, moderation/abuse controls, reviewed edits/disconnections, proposal idempotency keys, reconciliation across shards, bulk ingestion/export, caching, backups/restore drills, and hosted load tests. Current history records content edits, not a complete changeset ledger. Topic navigation shows the 100 largest topics; search covers the full corpus.

## Validation

Run `npm run typecheck`, `npm test`, and `npm run build`. The repository tests use real SQLite/production SQL to test persistence, transactions, simultaneous writes, proposals, metadata, FTS updates, paginated backlinks, import/export, database reopening, and the scale fixture.

This execution session had no browser available for visual or live WebMCP validation. Do not claim screenshot, interaction, accessibility, or browser WebMCP checks were performed. The HTTP and stdio paths are independently testable.
