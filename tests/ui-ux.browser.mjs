import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer";
import { createApp } from "../server/app.mjs";

// Disposable in-memory service and isolated Chromium profile: no real user data.
const base = "http://127.0.0.1:8798";
const server = createApp({ database: ":memory:", origins: base });
server.listen(8798, "127.0.0.1");
await once(server, "listening");
const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
mkdirSync("test-results", { recursive: true });
const errors = [];
const checks = [];
function passed(description) { checks.push(description); console.log("PASS", description); }
const graph = { schema: 2, anchor: "v", nodes: [
  { id: "v", text: "Reduce avoidable suffering", kind: "value", sources: [{ id: "s", title: "Illustrative reference", url: "https://example.org/evidence", locator: "Section 2" }] },
  { id: "r", text: "Compare the likely consequences", kind: null },
  { id: "b", text: "Consider a rights-based alternative", kind: null },
], edges: [{ id: "vr", from: "v", to: "r", label: "therefore" }, { id: "vb", from: "v", to: "b", label: "alternative" }] };
const queue = { draftId: "ui-test", steps: [{ id: "pending", text: "A continuation for review", kind: null, parentId: "v", rationale: "For review", excerpt: "", status: "pending" }] };
async function button(page, name) {
  const handle = await page.waitForFunction(name => [...document.querySelectorAll("button")].find(b => !b.disabled && (b.textContent.trim() === name || b.getAttribute("aria-label") === name)), {}, name);
  await handle.asElement().click(); await handle.dispose();
}
async function snapshot(page) {
  return page.evaluate(() => { const s = JSON.parse(localStorage.getItem("axiomer.tldraw.roadmaps.v1")); return { graph: s.drafts[0].graph, queue: s.queue, layout: localStorage.getItem("axiomer.tldraw.arrangements.v1") }; });
}
async function withinViewport(page, selector) {
  return page.$eval(selector, e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth; });
}
async function fits(page) {
  // React Flow's initial fit and responsive measurement complete on animation
  // frames even with reduced motion. Assert the settled result, not a midpoint.
  await page.evaluate(() => new Promise(resolve => {
    let previous = "", unchangedSince = performance.now();
    function check(now) {
      const current = document.querySelector(".react-flow__viewport")?.style.transform;
      if (current !== previous) { previous = current; unchangedSince = now; }
      if (now - unchangedSince >= 200) resolve(true);
      else requestAnimationFrame(check);
    }
    requestAnimationFrame(check);
  }));
  await page.waitForFunction(() => {
    const map = document.querySelector(".map-canvas").getBoundingClientRect();
    const cards = [...document.querySelectorAll(".react-flow__node")];
    return cards.length === 3 && cards.every(n => { const b = n.getBoundingClientRect(); return b.left >= map.left && b.right <= map.right + 1 && b.top >= map.top + 95 && b.bottom <= map.bottom + 1; });
  });
}
try {
  const page = await browser.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const seed = await page.evaluateOnNewDocument(({ graph, queue }) => {
    localStorage.setItem("axiomer.tldraw.roadmaps.v1", JSON.stringify({ drafts: [{ id: "ui-test", title: "UI verification", graph, updated: new Date().toISOString() }], activeDraftId: "ui-test", queue }));
    localStorage.setItem("axiomer.tldraw.arrangements.v1", JSON.stringify({ "ui-test": { b: { x: 400, y: 210 } } }));
  }, { graph, queue });
  await page.goto(base); await page.removeScriptToEvaluateOnNewDocument(seed.identifier);
  await page.waitForSelector(".thought-content");
  const original = await snapshot(page);
  await button(page, "Edit thought");
  assert.equal(await withinViewport(page, ".quick-edit-footer .primary-button"), true);
  assert.equal(await page.$$eval(".editor-options[open]", els => els.length), 0);
  assert.equal(await page.$eval('textarea[name="text"]', e => document.activeElement === e), true);
  // Native disclosures stay in keyboard order; hidden fields stay out of it.
  const focusOrder = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    focusOrder.push(await page.evaluate(() => { const e = document.activeElement; return { tag: e.tagName, text: e.textContent.trim(), name: e.getAttribute("name"), inside: !!e.closest('[role="dialog"]') }; }));
  }
  assert.ok(focusOrder.every(e => e.inside));
  assert.ok(focusOrder.filter(e => e.tag === "SUMMARY").length >= 4);
  assert.ok(!focusOrder.some(e => e.name?.startsWith("source-") || e.name === "kind" || e.name?.startsWith("position-")));
  await page.focus('[aria-label="Close dialog"]'); await page.keyboard.down("Shift"); await page.keyboard.press("Tab"); await page.keyboard.up("Shift");
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Save thought");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Close dialog");
  await page.focus(".source-options summary"); await page.keyboard.press("Enter");
  assert.equal(await page.$eval(".source-options", e => e.open), true);
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.name), "source-title-0");
  await page.focus(".source-options summary"); await page.keyboard.press("Enter");
  await button(page, "Save thought");
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  assert.deepEqual(await snapshot(page), original);
  passed("390px Save visible; closed/open disclosures and keyboard wrapping; unchanged collapsed source/kind/layout/AI queue preserved");
  await button(page, "Edit thought");
  await page.click(".source-options summary");
  await page.$eval('input[name="source-title-0"]', e => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(e, ""); e.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.click(".source-options summary"); await button(page, "Save thought");
  assert.equal(await page.$eval(".source-options", e => e.open), true);
  assert.deepEqual(await snapshot(page), original);
  await page.keyboard.press("Escape");
  await button(page, "More map actions");
  assert.equal(await page.$eval('[role="dialog"]', e => e.getAttribute("aria-label")), "Map actions");
  assert.equal(await page.$('textarea[name="text"]'), null);
  assert.ok(await page.$('button'));
  await page.keyboard.press("Escape");
  passed("invalid collapsed source reopens its disclosure without saving; Escape; separate Map actions");
  await page.setViewport({ width: 1440, height: 1000 });
  await page.waitForSelector(".thought-content");
  await page.waitForNetworkIdle({ idleTime: 250, timeout: 12000 });
  await button(page, "Fit map"); await fits(page);
  const before = await snapshot(page);
  const viewport = await page.$eval(".react-flow__viewport", e => e.style.transform);
  assert.equal(await page.$eval('[aria-label="Zoom in"]', e => { const b = e.getBoundingClientRect(); return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest("button") === e; }), true);
  await button(page, "Zoom in");
  await page.waitForFunction(before => document.querySelector(".react-flow__viewport").style.transform !== before, {}, viewport);
  await button(page, "Zoom out");
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(550, 750); await page.mouse.down(); await page.mouse.move(950, 750, { steps: 8 }); await page.mouse.up();
  }
  await button(page, "Fit map"); await fits(page);
  assert.deepEqual(await snapshot(page), before);
  await page.mouse.move(550, 750); await page.mouse.down(); await page.mouse.move(950, 750, { steps: 8 }); await page.mouse.up();
  await button(page, "Whole map"); await fits(page);
  await page.mouse.move(550, 750); await page.mouse.down(); await page.mouse.move(950, 750, { steps: 8 }); await page.mouse.up();
  await button(page, "Whole map"); await fits(page);
  assert.deepEqual(await snapshot(page), before);
  await button(page, "Follow a path"); await fits(page);
  const focusedViewport = await page.$eval(".react-flow__viewport", e => e.style.transform);
  await button(page, "Zoom in");
  await page.waitForFunction(before => document.querySelector(".react-flow__viewport").style.transform !== before, {}, focusedViewport);
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
  assert.notEqual(await page.$eval(".react-flow__viewport", e => e.style.transform), focusedViewport);
  await button(page, "Whole map"); await fits(page);
  passed("explicit zoom changes viewport; Fit and repeated Whole map recover panning within exposed canvas without graph/order/layout/AI mutation");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: "test-results/ui-desktop.png" });
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.waitForSelector(".thought-content"); await page.waitForNetworkIdle({ idleTime: 250, timeout: 12000 }); await button(page, "Fit map"); await fits(page);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await withinViewport(page, ".viewport-controls"), true);
  await page.screenshot({ path: "test-results/ui-mobile.png" });
  await page.setViewport({ width: 800, height: 1000 });
  await page.waitForSelector(".thought-content");
  await page.waitForNetworkIdle({ idleTime: 250, timeout: 12000 });
  assert.equal(await page.evaluate(() => {
    const search = document.querySelector(".map-search").getBoundingClientRect();
    const controls = document.querySelector(".viewport-controls").getBoundingClientRect();
    return search.right <= controls.left;
  }), true);
  passed("800px selected-thought search and viewport controls do not overlap");
  await page.screenshot({ path: "test-results/ui-narrow-desktop.png" });
  const registered = await fetch(`${base}/api/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "ui-author", password: "a-strong-test-password" }) });
  assert.equal(registered.status, 200);
  const published = await fetch(`${base}/api/arguments`, { method: "POST", headers: { "content-type": "application/json", cookie: registered.headers.get("set-cookie").split(";")[0] }, body: JSON.stringify({ title: "Readonly UI fixture", graph, note: "For verification" }) });
  assert.equal(published.status, 201);
  const { id } = await published.json();
  const context = await browser.createBrowserContext(); const reader = await context.newPage();
  reader.on("pageerror", e => errors.push(e.message));
  await reader.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await reader.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await reader.goto(`${base}/argument/${id}`); await reader.waitForSelector(".thought-content");
  await button(reader, "Zoom in"); await button(reader, "Zoom out"); await button(reader, "Fit map"); await fits(reader);
  assert.equal(await reader.$$eval(".connection-handle,.react-flow__node.draggable,.thought-edit-button", els => els.length), 0);
  await button(reader, "More map actions");
  assert.equal(await reader.$$eval("button", els => els.some(b => ["Save thought", "Undo last change", "Remove this thought"].includes(b.textContent.trim()))), false);
  assert.equal(await reader.evaluate(() => JSON.parse(localStorage.getItem("axiomer.tldraw.roadmaps.v1")).drafts.length), 0);
  passed("readonly mobile viewer has Fit/zoom while retaining no edit/drag/connect/Undo controls or local draft");
  assert.deepEqual(errors, []);
  writeFileSync("test-results/ui-verification.json", JSON.stringify({ passed: true, checks, errors, liveInference: false }, null, 2));
  console.log("PASS UI/UX:", checks.join("; "));
} catch (error) {
  console.error("UI verification failure", error);
  throw error;
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
