import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { createApp } from "../server/app.mjs";

// Provider fixture exercises the real HTTP adapter and UI, not live inference.
const server = createApp({
  database: ":memory:",
  origins: "http://127.0.0.1:8796",
  fetcher: async (_url, options) => {
    const input = JSON.parse(JSON.parse(options.body).messages[1].content);
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                steps: [
                  {
                    id: "suggestion-one",
                    text: "Approved AI reason",
                    parentId: input.selectedId,
                    kind: null,
                    rationale: "An inference for review",
                    excerpt: "",
                  },
                  {
                    id: "suggestion-two",
                    text: "Rejected AI reason",
                    parentId: "suggestion-one",
                    kind: null,
                    rationale: "Another inference",
                    excerpt: "",
                  },
                  {
                    id: "suggestion-three",
                    text: "Blocked dependent",
                    parentId: "suggestion-two",
                    kind: null,
                    rationale: "Depends on the rejected thought",
                    excerpt: "",
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
  },
});
server.listen(8796, "127.0.0.1");
await once(server, "listening");
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const temporary = mkdtempSync(join(tmpdir(), "axiomer-browser-"));
const errors = [];
mkdirSync("test-results", { recursive: true });
const base = "http://127.0.0.1:8796";
async function resize(p, viewport) {
  await p.setViewport(viewport);
  // Changing touch/mobile emulation reloads the page in Chromium.
  await p.waitForNetworkIdle({ idleTime: 100, timeout: 12000 });
}
async function page(context) {
  const p = await context.newPage();
  await resize(p, { width: 1440, height: 1000 });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  return p;
}
async function button(p, name) {
  console.log("Click:", name);
  await p.waitForFunction(
    (name) =>
      [...document.querySelectorAll("button")].some(
        (b) =>
          (b.textContent.trim() === name ||
            b.getAttribute("aria-label") === name ||
            b.querySelector("strong")?.textContent === name) &&
          !b.disabled,
      ),
    {},
    name,
  );
  const h = await p.evaluateHandle(
    (name) =>
      [...document.querySelectorAll("button")].find(
        (b) =>
          (b.textContent.trim() === name ||
            b.getAttribute("aria-label") === name ||
            b.querySelector("strong")?.textContent === name) &&
          !b.disabled,
      ),
    name,
  );
  await h.asElement().click();
  await h.dispose();
}
async function fill(p, selector, text) {
  await p.waitForSelector(selector);
  await p.$eval(
    selector,
    (e, text) => {
      const setter = Object.getOwnPropertyDescriptor(
        e instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(e, text);
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
    },
    text,
  );
}
async function includes(p, text) {
  try {
    await p.waitForFunction(
      (text) => document.body.textContent.includes(text),
      { timeout: 12000 },
      text,
    );
  } catch (e) {
    console.log(
      "MISSING",
      text,
      await p.evaluate(() => document.body.innerText),
    );
    await p.screenshot({ path: "test-results/failure.png" });
    throw e;
  }
}
async function noDialog(p) {
  await p.waitForFunction(() => !document.querySelector("[role=dialog]"));
}
async function register(p, name) {
  await button(p, "Sign in");
  await includes(p, "Username");
  await fill(p, "input[name=name]", name);
  await fill(p, "input[name=password]", "test-password-long");
  await button(p, "Create account");
  await noDialog(p);
}
async function graph(p) {
  return p.evaluate(
    () =>
      JSON.parse(localStorage.getItem("axiomer.tldraw.roadmaps.v1")).drafts[0].graph,
  );
}
try {
  const owner = await browser.createBrowserContext(),
    reader = await browser.createBrowserContext();
  const p = await page(owner),
    q = await page(reader);
  await p.goto(base);
  await includes(p, "Every belief");
  await p.screenshot({ path: "test-results/welcome.png" });
  await button(p, "Start with a value");
  await fill(p, "input[name=title]", "A clear argument");
  await fill(
    p,
    "textarea[name=value]",
    "We should reduce avoidable suffering.",
  );
  await button(p, "Create map");
  await noDialog(p);
  await button(p, "Continue this step");
  await fill(p, "#next-step", "Compare likely consequences before deciding.");
  await button(p, "Add step");
  await includes(p, "End of this path");
  assert.equal((await graph(p)).nodes.length, 2);
  assert.equal((await graph(p)).nodes[1].kind, null);
  await button(p, "Back");
  await button(p, "Add another branch");
  await fill(p, "#next-step", "Consider rights and the people affected.");
  await button(p, "Add step");
  await button(p, "Back");
  await includes(p, "Choose a branch");
  assert.equal((await graph(p)).edges.length, 2);
  await button(p, "Build with AI");
  await fill(
    p,
    'textarea[maxlength="30000"]',
    "I care about reducing suffering while recognizing rights.",
  );
  await fill(p, "input[type=password]", "fixture-key-not-real");
  await button(p, "Draft a path");
  await includes(p, "Approved AI reason");
  await fill(
    p,
    'textarea[aria-label="Edit proposed thought"]',
    "An edited and approved reason",
  );
  await button(p, "Approve");
  await includes(p, "Rejected AI reason");
  assert.equal((await graph(p)).nodes.length, 4);
  await p.reload();
  await button(p, "Build with AI");
  await includes(p, "Rejected AI reason");
  await button(p, "Reject");
  await includes(p, "dependent steps skipped");
  await button(p, "Close dialog");
  assert.equal((await graph(p)).nodes.length, 4);
  assert.equal(
    await p.evaluate(() =>
      JSON.stringify(localStorage).includes("fixture-key-not-real"),
    ),
    false,
  );
  await button(p, "Whole map");
  await p.waitForSelector(".react-flow__node");
  await p.waitForFunction(() => !document.querySelector(".map-loading"));
  await p.screenshot({ path: "test-results/desktop.png" });
  await register(p, "map-author");
  await button(p, "Publish");
  await fill(p, "textarea[name=note]", "Initial reasoning");
  await button(p, "Publish revision");
  await noDialog(p);
  const publishedId = await p.evaluate(
    () =>
      JSON.parse(localStorage.getItem("axiomer.tldraw.roadmaps.v1")).drafts[0]
        .publishedId,
  );
  assert.ok(publishedId);
  await q.goto(`${base}/argument/${publishedId}`);
  await includes(q, "We should reduce avoidable suffering.");
  await register(q, "map-reader");
  await button(q, "Suggest a change");
  await button(q, "Edit thought");
  await fill(
    q,
    "textarea[name=text]",
    "We should reduce avoidable suffering, including indirect harms.",
  );
  await button(q, "Save thought");
  await button(q, "Propose change");
  await fill(q, "input[name=title]", "Include indirect effects");
  await fill(q, "textarea[name=note]", "Clarify the starting value.");
  await button(q, "Submit proposal");
  await noDialog(q);
  await p.goto(`${base}/argument/${publishedId}`);
  await includes(p, "We should reduce avoidable suffering.");
  await button(p, "More map actions");
  await button(p, "Proposed changes");
  await button(p, "Include indirect effects");
  await includes(p, "including indirect harms.");
  await button(p, "Accept change");
  await noDialog(p);
  await includes(
    p,
    "We should reduce avoidable suffering, including indirect harms.",
  );
  await button(p, "More map actions");
  await button(p, "Version history");
  await p.waitForFunction(
    () => document.querySelectorAll(".revision-list button").length === 2,
  );
  const revisions = await p.$$eval(".revision-list button", (bs) =>
    bs.map((b) => b.textContent),
  );
  assert.equal(revisions.length, 2);
  const historyButtons = await p.$$(".revision-list button");
  await historyButtons[1].click();
  await noDialog(p);
  await p.waitForFunction(() => location.search.includes("revision="));
  assert.equal(
    await p.$eval(".thought-content", (n) => n.textContent),
    "We should reduce avoidable suffering.",
  );
  await p.goBack();
  await p.waitForFunction(() => !location.search);
  await includes(
    p,
    "We should reduce avoidable suffering, including indirect harms.",
  );
  await resize(p, {
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });
  await p.waitForSelector(".react-flow__node");
  await p.waitForFunction(() => !document.querySelector(".map-loading"));
  await p.screenshot({ path: "test-results/mobile.png" });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  // A real two-person stale proposal: owner edits while the reader is drafting.
  await resize(p, { width: 1440, height: 1000 });
  await q.goto(`${base}/argument/${publishedId}`);
  await includes(
    q,
    "We should reduce avoidable suffering, including indirect harms.",
  );
  await button(q, "Suggest a change");
  await button(q, "Edit thought");
  await fill(q, "textarea[name=text]", "My revised starting value.");
  await button(q, "Save thought");
  await button(q, "Propose change");
  await fill(q, "input[name=title]", "Reconsider starting value");
  await fill(q, "textarea[name=note]", "I propose a clearer foundation.");
  await button(q, "Submit proposal");
  await noDialog(q);
  await p.goto(`${base}/argument/${publishedId}`);
  await includes(
    p,
    "We should reduce avoidable suffering, including indirect harms.",
  );
  await button(p, "Edit draft");
  await button(p, "Edit thought");
  await fill(p, "textarea[name=text]", "Owner revised the starting value.");
  await button(p, "Save thought");
  await button(p, "Add another branch");
  await fill(p, "#next-step", "The owner's new branch survives an update.");
  await button(p, "Add step");
  await button(p, "Publish");
  await fill(p, "textarea[name=note]", "Clarify foundation and add a branch");
  await button(p, "Publish revision");
  await noDialog(p);
  await button(p, "More map actions");
  await button(p, "Proposed changes");
  await button(p, "Reconsider starting value");
  await includes(p, "The argument has changed since this proposal.");
  assert.equal(
    await p.$$eval(
      "button",
      (bs) => bs.find((b) => b.textContent.trim() === "Accept change").disabled,
    ),
    true,
  );
  await q.goto(`${base}/argument/${publishedId}`);
  await includes(q, "Owner revised the starting value.");
  await button(q, "More map actions");
  await button(q, "Proposed changes");
  await button(q, "Reconsider starting value");
  await button(q, "Update my proposal");
  await includes(q, "choose a version");
  assert.equal(
    await q.$$eval(
      "button",
      (bs) =>
        bs.find((b) => b.textContent.trim() === "Prepare updated draft")
          .disabled,
    ),
    true,
  );
  assert.equal(
    await q.$$eval(".merge-options input", (xs) => xs.some((x) => x.checked)),
    false,
  );
  await q.screenshot({ path: "test-results/correction-update.png" });
  await q.click('input[aria-label="Keep my proposed version"]');
  await button(q, "Prepare updated draft");
  await noDialog(q);
  await q.reload();
  await includes(q, "My revised starting value.");
  assert.ok(
    (await graph(q)).nodes.some(
      (n) => n.text === "The owner's new branch survives an update.",
    ),
  );
  await button(q, "Propose change");
  await includes(q, "publicly readable");
  await fill(q, "input[name=title]", "Updated foundation");
  await fill(
    q,
    "textarea[name=note]",
    "Keep the new owner branch while updating the foundation.",
  );
  await button(q, "Submit updated proposal");
  await noDialog(q);
  await p.goto(`${base}/argument/${publishedId}`);
  await includes(p, "Owner revised the starting value.");
  await button(p, "More map actions");
  await button(p, "Proposed changes");
  await button(p, "Reconsider starting value");
  await includes(p, "superseded");
  await button(p, "View updated proposal");
  await includes(p, "Updated foundation");
  await button(p, "Accept change");
  await noDialog(p);
  await includes(p, "My revised starting value.");

  // Seed retained relation metadata via API, then review the semantic-only correction through UI.
  const withMeaning = await p.evaluate(async (publishedId) => {
    const current = await (await fetch(`/api/arguments/${publishedId}`)).json();
    current.revision.graph.edges[0].semantic = {
      from: current.revision.graph.edges[0].to,
      to: current.revision.graph.edges[0].from,
      type: "supports",
    };
    const response = await fetch("/api/arguments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: publishedId,
        title: current.argument.title,
        baseRevision: current.argument.head,
        graph: current.revision.graph,
        note: "Preserve original relation meaning",
      }),
    });
    if (!response.ok) throw new Error("Fixture publication failed");
    return await response.json();
  }, publishedId);
  await q.evaluate(async (publishedId) => {
    const current = await (await fetch(`/api/arguments/${publishedId}`)).json();
    current.revision.graph.edges[0].semantic.type = "conflicts";
    const r = await fetch(`/api/arguments/${publishedId}/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Clarify original relationship",
        reason: "The relation challenges this foundation.",
        baseRevision: current.argument.head,
        graph: current.revision.graph,
      }),
    });
    if (!r.ok) throw new Error("Fixture correction failed");
  }, publishedId);
  await p.goto(`${base}/argument/${publishedId}`);
  await includes(p, "My revised starting value.");
  await button(p, "More map actions");
  await button(p, "Proposed changes");
  await button(p, "Clarify original relationship");
  await includes(p, "Connection changed");
  const relation = await p.$eval(".relationship-change", (e) => e.textContent);
  assert.ok(relation.includes("supports") && relation.includes("conflicts"));
  await p.screenshot({ path: "test-results/relationship-review.png" });
  await button(p, "Accept change");
  await noDialog(p);
  await includes(p, "My revised starting value.");
  // Both link meanings are explicit, including when sharing an older revision.
  await p.goto(
    `${base}/argument/${publishedId}?revision=${withMeaning.revision}`,
  );
  await includes(p, "My revised starting value.");
  await button(p, "More map actions");
  await button(p, "Share published argument");
  assert.equal(
    await p.$eval('input[aria-label="Latest version link"]', (e) => e.value),
    `${base}/argument/${publishedId}`,
  );
  assert.equal(
    await p.$eval(
      'input[aria-label="This published revision link"]',
      (e) => e.value,
    ),
    `${base}/argument/${publishedId}?revision=${withMeaning.revision}`,
  );
  await button(p, "Copy latest version link");
  await p.screenshot({ path: "test-results/share-links.png" });
  await resize(p, {
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await button(p, "More map actions");
  await button(p, "Share published argument");
  await p.screenshot({ path: "test-results/share-mobile.png" });
  await button(p, "Close dialog");

  // Import a 500-step path with a second branch, then jump to and read its deepest node.
  const nodes = Array.from({ length: 501 }, (_, i) => ({
    id: `large-${i}`,
    text: `Reasoning step ${i}: a clear explanation.`,
    kind: i === 0 ? "value" : null,
  }));
  const edges = nodes.slice(1).map((n, i) => ({
    id: `edge-${i}`,
    from: `large-${i}`,
    to: n.id,
    label: "",
  }));
  nodes.push({ id: "branch", text: "An alternative path", kind: null });
  edges.push({ id: "branch-edge", from: "large-5", to: "branch", label: "" });
  const file = join(temporary, "large-map.json");
  writeFileSync(
    file,
    JSON.stringify({
      title: "Large map",
      graph: { schema: 2, anchor: "large-0", nodes, edges },
    }),
  );
  await resize(p, { width: 1440, height: 1000 });
  await button(p, "Library");
  const input = await p.$("input[type=file]");
  await input.uploadFile(file);
  await noDialog(p);
  await includes(p, "502 thoughts");
  await fill(p, 'input[aria-label="Search thoughts"]', "Reasoning step 500:");
  await button(p, "Reasoning step 500: a clear explanation.");
  await includes(p, "End of this path");
  assert.equal(
    await p.$eval(".thought-content", (n) => n.textContent),
    "Reasoning step 500: a clear explanation.",
  );
  await button(p, "Follow a path");
  try {
  await p.waitForFunction(() => {
    const ids = [...document.querySelectorAll(".react-flow__node")].map((n) =>
      n.getAttribute("data-id"),
    );
    return (
      ids.length === 2 && ids.includes("large-499") && ids.includes("large-500")
    );
  });
  } catch (error) {
    console.log('FOCUS STATE',await p.evaluate(()=>({mode:document.querySelector('.map-bottom-tools button.selected')?.textContent,nodes:[...document.querySelectorAll('.react-flow__node')].map(n=>({id:n.getAttribute('data-id'),style:n.getAttribute('style')})),viewport:document.querySelector('.react-flow__viewport')?.getAttribute('style')})));
    await p.screenshot({path:'test-results/focus-failure.png'});throw error;
  }
  await p.screenshot({ path: "test-results/large-map.png" });
  // A broad map with a shared conclusion exercises branching and convergence.
  const broadNodes = Array.from({ length: 201 }, (_, i) => ({
    id: `broad-${i}`,
    text: i === 0 ? "A broad starting value." : `Broad reasoning step ${i}.`,
    kind: i === 0 ? "value" : null,
  }));
  broadNodes.push({ id: "shared", text: "A shared conclusion.", kind: null });
  const broadEdges = broadNodes
    .slice(1, 201)
    .map((n, i) => ({
      id: `broad-edge-${i}`,
      from: "broad-0",
      to: n.id,
      label: "",
    }));
  for (let i = 1; i <= 10; i++)
    broadEdges.push({
      id: `shared-edge-${i}`,
      from: `broad-${i}`,
      to: "shared",
      label: "",
    });
  const broadFile = join(temporary, "broad-map.json");
  writeFileSync(
    broadFile,
    JSON.stringify({
      title: "Broad map",
      graph: {
        schema: 2,
        anchor: "broad-0",
        nodes: broadNodes,
        edges: broadEdges,
      },
    }),
  );
  await button(p, "Library");
  await input.uploadFile(broadFile);
  await noDialog(p);
  await includes(p, "202 thoughts");
  await fill(
    p,
    'input[aria-label="Search thoughts"]',
    "Broad reasoning step 150.",
  );
  await button(p, "Broad reasoning step 150.");
  assert.equal(
    await p.$eval(".thought-content", (n) => n.textContent),
    "Broad reasoning step 150.",
  );
  await fill(p, 'input[aria-label="Search thoughts"]', "A shared conclusion.");
  await button(p, "A shared conclusion.");
  await button(p, "Follow a path");
  await p.waitForFunction(() => {
    const ids = [...document.querySelectorAll(".react-flow__node")].map((n) =>
      n.getAttribute("data-id"),
    );
    return (
      ids.length === 11 &&
      ids.includes("shared") &&
      ids.includes("broad-1") &&
      ids.every((id) => id === "shared" || /^broad-(?:[1-9]|10)$/.test(id))
    );
  });
  await p.waitForFunction(() => document.querySelector('.thought-content')?.textContent === 'A shared conclusion.');
  await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await p.screenshot({ path: "test-results/broad-map.png" });
  assert.equal(
    (await graph(p)).edges.filter((e) => e.to === "shared").length,
    10,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser creation, branching, optional labels, AI review/edit/reject/recovery, key privacy, two-account correction, stale update/conflict resolution, semantic review, explicit share links, history, mobile layout, 502-node deep navigation and 202-node broad/converging navigation. Live AI inference was not used.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  rmSync(temporary, { recursive: true });
}
