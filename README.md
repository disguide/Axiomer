# Axiomer

Your thinking, organized and connected.

A project workspace for readable arguments and original sources. Keep your work in projects and folders, write a question or statement, and connect supporting or challenging reasons. Follow any reason into its own neighborhood and reuse existing arguments and citations.

## Use it

- **All projects** is your home. Create a project, add folders, and save arguments and sources inside them. **Unfiled** holds items without a project.
- The item list has filters for arguments and sources, folder search, and selection for moving several items. Each item has one saved home; its graph connections work across projects.
- **Read** opens by default. **Map** shows the selected argument with supporting and opposing reasons.
- Select a reason for details; **Open this argument** makes it the center.
- **New argument** starts a question. Add reasons and sources using **Write new** or **Use existing**.
- **Search** (Ctrl/Cmd K) finds words in arguments, explanations, and publishers.
- **Add source** saves original URLs, publishers, and passage locators in the current folder.
- **Suggestions** holds agent proposals. Accepted proposals become connections in the parent's folder; outdated proposals must be resubmitted.
- Edits preserve earlier versions. Unlink removes a relationship without deleting shared arguments.
- Rename or remove a folder/project from its options menu. Removing a folder returns its items to the project home; removing a project returns its items to Unfiled. Both preserve every node and connection.

## Development

Node 22.13+ is required for the local SQLite adapter.

```sh
npm install
npm run dev
```

Open the Vite URL (normally `http://127.0.0.1:5173`). The API listens on loopback port 4174. Local knowledge persists in `.local/axiomer.db`, outside source control. Hosted knowledge uses Cloudflare D1. These databases are separate; deployment does not upload your local knowledge.

```sh
npm run typecheck
npm test
npm run build
```

The build produces `dist/client/` and `dist/server/index.js`. Schema and generated migrations live in `db/` and `drizzle/`.

## Agents

Agents use the same persistent repository as the interface:

- `list_projects`, `list_folders`: discover saved organization in bounded pages.
- `search_arguments`: bounded result pages and stable IDs; optionally filter by project and folder.
- `read_argument`: one neighborhood, sources, and paginated backlinks.
- `propose_argument`: a connected node staged for review, with parent version and rationale.

Start Axiomer, then run `npm run mcp` for the stdio transport. It defaults to the local API. Set `AXIOMER_URL` for another server; a private hosted space requires an authorized site session (`AXIOMER_COOKIE`). Never put session credentials in source or URLs. Optional browser WebMCP registration uses the current page session.

Discover `/api/agent-tools`; execute `POST /api/agent-call`. See [architecture and API details](docs/REBUILD.md).

## Earlier work

The earlier editor remains at `/legacy` and `/editor/:projectId/:branchId`. Existing local browser keys and compressed `#tree=` links are retained. Browser data is origin-specific: use your original local URL to export it, then import into the hosted space.

**Import a map** accepts old and new JSON, up to 200 nodes, 500 edges, and 100 KB per transaction. Imports create separate maps and retain the exact original at `/api/imports/<new-root-id>`. Export downloads the **displayed neighborhood**, with a truncation flag if more connections exist. [Earlier documentation](docs/LEGACY_README.md) is retained.

## Scale and trust

The UI renders neighborhoods rather than the entire corpus. Indexed nodes/edges, full-text search, keyset pagination, and transactional aggregate counters support growth. Tests exercise 100,000 synthetic nodes and a 10,000-edge hub.

This release is an **owner-private knowledge space**, protected by Sites access controls. Its application API treats an owner session as a trusted editor. Agent tools stage proposals by convention; they are not a separate security role. Public contributions require application roles, moderation, rate limiting, and a larger storage/search deployment. See [the scaling path and current limits](docs/REBUILD.md#scaling-path).
