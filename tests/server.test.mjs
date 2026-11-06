import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createApp } from "../server/app.mjs";
import {
  exampleGraph,
  addThought,
  rebaseRoadmap,
} from "../client/src/roadmap/model.ts";

async function start(options = {}) {
  const server = createApp({ database: ":memory:", ...options });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, url: `http://127.0.0.1:${server.address().port}/api` };
}
async function call(url, path, body, cookie = "", extra = {}) {
  const r = await fetch(url + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
const register = (url, name) =>
  call(url, "/register", { name, password: "a-strong-test-password" });
const close = (server) => new Promise((resolve) => server.close(resolve));

test("two accounts publish, propose and review without overwriting history or newer work", async (t) => {
  const { server, url } = await start();
  t.after(() => close(server));
  const owner = await register(url, "author"),
    contributor = await register(url, "reader");
  assert.equal(owner.status, 200);
  assert.equal(contributor.status, 200);
  const original = exampleGraph();
  assert.equal(
    (
      await call(url, "/arguments", {
        title: "Map",
        graph: original,
        note: "First",
      })
    ).status,
    401,
  );
  const published = await call(
    url,
    "/arguments",
    { title: "Map", graph: original, note: "First" },
    owner.cookie,
  );
  assert.equal(published.status, 201);
  const { id, revision } = published.data;
  const graph = addThought(original, "A useful correction", "a", null, "new");
  assert.equal(
    (
      await call(
        url,
        "/arguments",
        {
          id,
          baseRevision: revision,
          title: "Hijack",
          graph,
          note: "Wrong owner",
        },
        contributor.cookie,
      )
    ).status,
    403,
  );
  const proposal = await call(
    url,
    `/arguments/${id}/proposals`,
    {
      title: "Clarify",
      reason: "Explain the missing step",
      baseRevision: revision,
      graph,
    },
    contributor.cookie,
  );
  assert.equal(proposal.status, 201);
  assert.equal(
    (
      await call(
        url,
        `/proposals/${proposal.data.id}/review`,
        { decision: "accept" },
        contributor.cookie,
      )
    ).status,
    403,
  );
  const accepted = await call(
    url,
    `/proposals/${proposal.data.id}/review`,
    { decision: "accept", note: "Useful" },
    owner.cookie,
  );
  assert.equal(accepted.status, 200);
  assert.equal(
    (
      await call(
        url,
        `/proposals/${proposal.data.id}/review`,
        { decision: "accept" },
        owner.cookie,
      )
    ).status,
    409,
  );
  const old = await call(url, `/arguments/${id}?revision=${revision}`);
  assert.equal(old.data.revision.graph.nodes.length, 7);
  const latest = await call(url, `/arguments/${id}`);
  assert.equal(latest.data.revision.graph.nodes.length, 8);
  assert.equal(latest.data.revision.authorName, "reader");
  const stale = await call(
    url,
    `/arguments/${id}/proposals`,
    {
      title: "Old base",
      reason: "This started earlier",
      baseRevision: revision,
      graph,
    },
    contributor.cookie,
  );
  assert.equal(
    (
      await call(
        url,
        `/proposals/${stale.data.id}/review`,
        { decision: "accept" },
        owner.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (await call(url, `/arguments/${id}`)).data.argument.head,
    accepted.data.revision,
  );
  assert.equal(
    (await call(url, `/arguments/${id}/revisions`)).data.revisions.length,
    2,
  );
  assert.equal(
    (await call(url, "/login", { name: "author", password: "incorrect" }))
      .status,
    401,
  );
  assert.equal(
    (
      await call(url, "/logout", {}, owner.cookie, {
        origin: "https://untrusted.example",
      })
    ).status,
    403,
  );
});

test("published maps survive a service restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "axiomer-")),
    database = join(dir, "store.sqlite");
  let app = await start({ database });
  try {
    const user = await register(app.url, "persistent");
    const p = await call(
      app.url,
      "/arguments",
      { title: "Durable", graph: exampleGraph(), note: "First revision" },
      user.cookie,
    );
    await close(app.server);
    app = await start({ database });
    assert.equal(
      (await call(app.url, `/arguments/${p.data.id}`)).data.argument.title,
      "Durable",
    );
  } finally {
    await close(app.server);
    rmSync(dir, { recursive: true });
  }
});

test("AI adapter returns reviewed proposals only, never publishes and never stores the key", async (t) => {
  let requested;
  const fetcher = async (url, options) => {
    requested = { url, options };
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                steps: [
                  {
                    id: "ai-one",
                    text: "A proposed reason",
                    parentId: "v",
                    kind: null,
                    rationale: "Inferred for review",
                    excerpt: "",
                  },
                ],
              }),
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  const { server, url } = await start({ fetcher });
  t.after(() => close(server));
  const input = {
    provider: "openai",
    model: "test-model",
    apiKey: "key-for-this-request-only",
    explanation: "Explain my perspective",
    graph: exampleGraph(),
    selectedId: "v",
  };
  const result = await call(url, "/ai/draft", input);
  assert.equal(result.status, 200);
  assert.equal(result.data.steps[0].status, "pending");
  assert.equal(requested.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(
    requested.options.headers.Authorization,
    "Bearer key-for-this-request-only",
  );
  assert.equal((await call(url, "/arguments")).data.arguments.length, 0);
  assert.equal(JSON.stringify(result.data).includes(input.apiKey), false);
  assert.equal(
    (
      await call(url, "/ai/draft", {
        ...input,
        provider: "https://attacker.invalid",
      })
    ).status,
    400,
  );
});

test("malformed and incomplete AI output cannot enter a draft", async (t) => {
  const { server, url } = await start({
    fetcher: async () =>
      new Response(
        JSON.stringify({
          choices: [
            { finish_reason: "length", message: { content: '{"steps":' } },
          ],
        }),
      ),
  });
  t.after(() => close(server));
  const r = await call(url, "/ai/draft", {
    provider: "openai",
    model: "test",
    apiKey: "test-key",
    explanation: "My view",
    graph: exampleGraph(),
  });
  assert.equal(r.status, 502);
  assert.match(r.data.error, /complete/);
});

test("Anthropic adapter uses its structured format and refuses fabricated excerpts", async (t) => {
  let request;
  let excerpt = "I care about clear reasoning";
  const { server, url } = await start({
    fetcher: async (endpoint, options) => {
      request = { endpoint, options, body: JSON.parse(options.body) };
      return new Response(
        JSON.stringify({
          stop_reason: "end_turn",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                steps: [
                  {
                    id: "anthropic-one",
                    text: "A concise continuation",
                    parentId: "v",
                    kind: null,
                    rationale: "From the explanation",
                    excerpt,
                  },
                ],
              }),
            },
          ],
        }),
      );
    },
  });
  t.after(() => close(server));
  const input = {
    provider: "anthropic",
    model: "test-model",
    apiKey: "test-key",
    explanation: "I care about clear reasoning and readable maps.",
    graph: exampleGraph(),
    selectedId: "v",
  };
  assert.equal((await call(url, "/ai/draft", input)).status, 200);
  assert.equal(request.endpoint, "https://api.anthropic.com/v1/messages");
  assert.equal(request.options.headers["x-api-key"], "test-key");
  assert.equal(request.body.output_config.format.type, "json_schema");
  excerpt = "The author never said this";
  const rejected = await call(url, "/ai/draft", input);
  assert.equal(rejected.status, 502);
  assert.match(rejected.data.error, /excerpt/);
});

test("proposal updates preserve history, enforce authorship/latest base, and review semantic changes", async (t) => {
  const { server, url } = await start();
  t.after(() => close(server));
  const owner = await register(url, "update-owner"),
    reader = await register(url, "update-reader"),
    intruder = await register(url, "other-reader");
  const base = exampleGraph();
  base.edges[0].semantic = { from: "r", to: "v", type: "supports" };
  const first = await call(
    url,
    "/arguments",
    { title: "Versioned", graph: base, note: "Initial" },
    owner.cookie,
  );
  const { id, revision } = first.data;
  const proposed = {
    ...base,
    edges: base.edges.map((e, i) =>
      i === 0
        ? { ...e, semantic: { from: "r", to: "v", type: "conflicts" } }
        : e,
    ),
  };
  const submitted = await call(
    url,
    `/arguments/${id}/proposals`,
    {
      title: "Change relationship",
      reason: "This challenges the value",
      baseRevision: revision,
      graph: proposed,
    },
    reader.cookie,
  );
  const latest = addThought(base, "Owner addition", "a", null, "owner-added");
  const published = await call(
    url,
    "/arguments",
    {
      id,
      title: "Versioned",
      baseRevision: revision,
      graph: latest,
      note: "Owner update",
    },
    owner.cookie,
  );
  const merged = rebaseRoadmap(base, proposed, latest);
  assert.ok(merged.graph);
  const body = {
    title: "Updated relationship",
    reason: "Keep the owner addition",
    baseRevision: published.data.revision,
    graph: merged.graph,
    replacesProposalId: submitted.data.id,
  };
  assert.equal(
    (await call(url, `/arguments/${id}/proposals`, body, intruder.cookie))
      .status,
    403,
  );
  assert.equal(
    (
      await call(
        url,
        `/arguments/${id}/proposals`,
        { ...body, baseRevision: revision },
        reader.cookie,
      )
    ).status,
    409,
  );
  const updated = await call(
    url,
    `/arguments/${id}/proposals`,
    body,
    reader.cookie,
  );
  assert.equal(updated.status, 201);
  const list = (await call(url, `/arguments/${id}/proposals`)).data.proposals;
  const old = list.find((p) => p.id === submitted.data.id),
    fresh = list.find((p) => p.id === updated.data.id);
  assert.equal(old.status, "superseded");
  assert.equal(old.superseded_by, updated.data.id);
  assert.deepEqual(old.graph, proposed);
  assert.equal(old.base, revision);
  assert.equal(fresh.supersedes, old.id);
  assert.equal(
    (await call(url, `/arguments/${id}`)).data.argument.head,
    published.data.revision,
  );
  assert.equal(
    (await call(url, `/arguments/${id}/proposals`, body, reader.cookie)).status,
    409,
  );
  assert.equal(
    (
      await call(
        url,
        `/proposals/${old.id}/review`,
        { decision: "accept" },
        owner.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await call(
        url,
        `/proposals/${fresh.id}/review`,
        { decision: "accept" },
        owner.cookie,
      )
    ).status,
    200,
  );
  const accepted = (await call(url, `/arguments/${id}`)).data;
  assert.equal(accepted.revision.graph.edges[0].semantic.type, "conflicts");
  assert.ok(accepted.revision.graph.nodes.some((n) => n.id === "owner-added"));
  assert.equal(
    (await call(url, `/arguments/${id}?revision=${revision}`)).data.revision
      .graph.edges[0].semantic.type,
    "supports",
  );
  const renumbered = {
    ...accepted.revision.graph,
    edges: accepted.revision.graph.edges.map((e) => ({
      ...e,
      id: "changed-" + e.id,
    })),
  };
  assert.equal(
    (
      await call(
        url,
        `/arguments/${id}/proposals`,
        {
          title: "No meaningful change",
          reason: "Identifiers only",
          baseRevision: accepted.revision.id,
          graph: renumbered,
        },
        reader.cookie,
      )
    ).status,
    400,
  );
});

test("additive proposal migration preserves existing rows and is safe to reopen", async () => {
  const dir = mkdtempSync(join(tmpdir(), "axiomer-migration-")),
    database = join(dir, "old.sqlite");
  const original = exampleGraph();
  const db = new DatabaseSync(database);
  db.exec(
    "CREATE TABLE proposals(id TEXT PRIMARY KEY,argument_id TEXT,author TEXT,base TEXT,title TEXT,reason TEXT,graph TEXT,status TEXT DEFAULT 'pending',review_note TEXT,created TEXT)",
  );
  db.prepare(
    "INSERT INTO proposals(id,argument_id,author,base,title,reason,graph,created) VALUES(?,?,?,?,?,?,?,?)",
  ).run(
    "old",
    "arg",
    "reader",
    "base",
    "Title",
    "Reason",
    JSON.stringify(original),
    "2026-10-20",
  );
  db.close();
  try {
    let app = await start({ database });
    await close(app.server);
    app = await start({ database });
    await close(app.server);
    const migrated = new DatabaseSync(database);
    const row = migrated
      .prepare("SELECT * FROM proposals WHERE id='old'")
      .get();
    assert.deepEqual(JSON.parse(row.graph), original);
    assert.equal(row.status, "pending");
    assert.equal(row.supersedes, null);
    assert.equal(row.superseded_by, null);
    migrated.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("source evidence survives public immutable revisions and source-only corrections", async (t) => {
  const { server, url } = await start();
  t.after(() => close(server));
  const owner = await register(url, "source-owner"), reader = await register(url, "source-reader");
  const source = { id: "source-1", title: "Original passage", url: "https://example.org/paper", locator: "p. 3" };
  const graph = exampleGraph();
  graph.nodes[0].sources = [source];
  const first = await call(url, "/arguments", { title: "Evidence", graph, note: "Cited argument" }, owner.cookie);
  assert.equal(first.status, 201);
  const { id, revision } = first.data;
  const publicView = await call(url, `/arguments/${id}`);
  assert.deepEqual(publicView.data.revision.graph.nodes[0].sources, [source]);
  const updated = { ...graph, nodes: graph.nodes.map((n, i) => i === 0 ? { ...n, sources: [{ ...source, locator: "p. 4" }] } : n) };
  const proposal = await call(url, `/arguments/${id}/proposals`, {
    title: "Correct citation", reason: "The passage is on page 4", baseRevision: revision, graph: updated,
  }, reader.cookie);
  assert.equal(proposal.status, 201);
  const accepted = await call(url, `/proposals/${proposal.data.id}/review`, { decision: "accept", note: "Checked page" }, owner.cookie);
  assert.equal(accepted.status, 200);
  const latest = await call(url, `/arguments/${id}`);
  assert.equal(latest.data.revision.graph.nodes[0].sources[0].locator, "p. 4");
  const fixed = await call(url, `/arguments/${id}?revision=${revision}`);
  assert.equal(fixed.data.revision.graph.nodes[0].sources[0].locator, "p. 3");
  const invalid = { ...graph, nodes: graph.nodes.map((n, i) => i === 0 ? { ...n, sources: [{ ...source, url: "https://user:secret@example.org" }] } : n) };
  const blocked = await call(url, "/arguments", { title: "Unsafe source", graph: invalid, note: "Invalid" }, owner.cookie);
  assert.equal(blocked.status, 400);
  assert.match(blocked.data.error, /Source URL/);
  const missing = await call(url, "/arguments", { title: "Missing map", note: "Invalid" }, owner.cookie);
  assert.equal(missing.status, 400);
  assert.match(missing.data.error, /Not an Axiomer roadmap/);
  const sourceFree = await call(url, `/arguments/${id}?revision=${revision}`);
  assert.deepEqual(sourceFree.data.revision.graph.nodes[0].sources, [source]);
});
