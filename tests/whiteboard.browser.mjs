import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer";
import { createApp } from "../server/app.mjs";
const server = createApp({ database: ":memory:", origins: "http://127.0.0.1:8797" });
server.listen(8797, "127.0.0.1"); await once(server, "listening");
const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const base = "http://127.0.0.1:8797";
const errors=[];
mkdirSync("test-results", { recursive: true });
async function button(p, name) {
  console.log("Click:", name);
  await p.waitForFunction(name => [...document.querySelectorAll("button")].some(b => (b.textContent.trim() === name || b.getAttribute("aria-label") === name) && !b.disabled), {}, name);
  const handle=await p.evaluateHandle(name => [...document.querySelectorAll("button")].find(b => (b.textContent.trim() === name || b.getAttribute("aria-label") === name) && !b.disabled), name);
  await handle.asElement().click(); await handle.dispose();
}
async function fill(p, selector, value) {
  await p.waitForSelector(selector); await p.$eval(selector, (e,value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,value);
    e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));
  }, value);
}
async function graph(p) { return p.evaluate(() => JSON.parse(localStorage.getItem("axiomer.roadmaps.v2")).drafts[0].graph); }
async function selectEdge(p,id) {
 const edge=await p.waitForSelector(`.react-flow__edge[data-id="${id}"]`);
 await edge.evaluate(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));
}
async function edgeCount(p,count) { await p.waitForFunction(count => JSON.parse(localStorage.getItem("axiomer.roadmaps.v2")).drafts[0].graph.edges.length===count, {}, count); }
async function noDialog(p) { await p.waitForFunction(() => !document.querySelector('[role=dialog]')); }
async function nodeBox(p,id,child="") {
 const h=await p.waitForSelector(`.react-flow__node[data-id="${id}"] ${child}`.trim()); return await h.boundingBox();
}
try {
 const ctx=await browser.createBrowserContext(); const p=await ctx.newPage();
 await p.setViewport({width:1440,height:1000}); p.on("pageerror",e=>errors.push(e.message));
 await p.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
 const initial={schema:2,anchor:"v",nodes:[{id:"v",text:"Reduce avoidable suffering",kind:"value"},{id:"a",text:"Consider consequences",kind:null},{id:"b",text:"Respect rights",kind:null}],edges:[{id:"va",from:"v",to:"a",label:""},{id:"vb",from:"v",to:"b",label:""}]};
 // Seed before React starts; writing under a running empty app can race its
 // initial persistence effect and leave the fixture at the welcome screen.
 const seed=await p.evaluateOnNewDocument(initial=>localStorage.setItem("axiomer.roadmaps.v2",JSON.stringify({drafts:[{id:"whiteboard",title:"Reasoning with evidence",graph:initial,updated:new Date().toISOString()}],queue:null,activeDraftId:"whiteboard"})),initial);
 await p.goto(base); await p.removeScriptToEvaluateOnNewDocument(seed.identifier);
 await button(p,"Edit thought"); await p.click(".source-options summary"); await button(p,"Add source");
 await fill(p,'input[name="source-title-0"]',"A source for the premise");
 await fill(p,'input[name="source-url-0"]',"https://example.org/evidence");
 await fill(p,'input[name="source-locator-0"]',"Section 2");
 await button(p,"Save thought"); await noDialog(p);
 assert.equal((await graph(p)).nodes[0].sources[0].url,"https://example.org/evidence");
 await p.reload(); await p.waitForSelector('.focus-sources a');
 assert.equal(await p.$eval('.focus-sources a',a=>a.getAttribute('rel')),"noopener noreferrer");
 await button(p,"Close thought"); await p.waitForSelector('.connection-handle'); await p.waitForNetworkIdle({idleTime:200,timeout:12000});
 // Draw a real pointer connection between two existing branches.
 const source=await nodeBox(p,"a",'.react-flow__handle.source'); const target=await nodeBox(p,"b",'.react-flow__handle.target');
 assert.ok(source && target);
 await p.mouse.move(source.x+source.width/2,source.y+source.height/2); await p.mouse.down();
 await p.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:16}); await p.mouse.up();
 await edgeCount(p,3);
 const added=(await graph(p)).edges.find(e=>e.from==="a"&&e.to==="b"); assert.ok(added);
 await selectEdge(p,added.id);
 await fill(p,'input[name="label"]',"also considers"); await button(p,"Save connection"); await noDialog(p);
 assert.equal((await graph(p)).edges.at(-1).label,"also considers");
 // Click/tap handle alternative is available alongside the form dropdown.
 await selectEdge(p,added.id);
 await button(p,"Remove connection"); await edgeCount(p,2); await button(p,"More map actions"); await button(p,"Undo last change"); await edgeCount(p,3);
 // Repositioning is view state: graph JSON and reading order stay unchanged.
 console.log("PASS sources, connect, label, remove and Undo");
 await p.waitForNetworkIdle({idleTime:200,timeout:12000});
 const before=JSON.stringify(await graph(p)); const box=await nodeBox(p,"a",'.thought-node');
 await p.mouse.move(box.x+60,box.y+30); await p.mouse.down(); await p.mouse.move(box.x+125,box.y+75,{steps:12}); await p.mouse.up();
 await p.waitForFunction(()=>!!JSON.parse(localStorage.getItem('axiomer.arrangements.v1')||'{}').whiteboard?.a);
 const position=await p.evaluate(()=>JSON.parse(localStorage.getItem('axiomer.arrangements.v1')).whiteboard.a);
 assert.equal(JSON.stringify(await graph(p)),before);
 await p.reload(); await p.waitForSelector('.react-flow__node');
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('axiomer.arrangements.v1')).whiteboard.a),position);
 // Single-pointer reposition alternative through contextual numeric fields.
 // A pending suggestion must survive a view-only edit.
 await p.evaluate(() => {
   const state=JSON.parse(localStorage.getItem('axiomer.roadmaps.v2'));
   state.queue={draftId:'whiteboard',steps:[{id:'pending-review',text:'A pending thought',kind:null,parentId:'v',rationale:'For review',excerpt:'',status:'pending'}]};
   localStorage.setItem('axiomer.roadmaps.v2',JSON.stringify(state));
 });
 await p.reload(); await p.waitForSelector('.thought-content');
 await button(p,"Close thought"); await p.click('.react-flow__node[data-id="a"]'); await button(p,"Edit thought");
 await p.click('.position-editor summary'); await fill(p,'input[name="position-x"]',"175"); await fill(p,'input[name="position-y"]',"225");
 await button(p,"Save thought"); await noDialog(p);
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('axiomer.arrangements.v1')).whiteboard.a),{x:175,y:225});
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('axiomer.roadmaps.v2')).queue.steps[0].status),'pending');
 assert.equal(JSON.stringify(await graph(p)), before);
 // Saving an unchanged relationship is not a graph edit and must keep review.
 await button(p,"Close thought");
 await selectEdge(p,'va');
 await button(p,"Save connection"); await noDialog(p);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('axiomer.roadmaps.v2')).queue.steps[0].status),'pending');
 assert.equal(JSON.stringify(await graph(p)),before);
 await p.click('.react-flow__node[data-id="a"]');
 // Existing dropdown remains accessible and rejects cycles without changing graph.
 await button(p,"Edit thought"); await p.click(".connection-options summary"); await p.select('select:not([name])',"v");
 await p.waitForFunction(()=>document.body.textContent.includes('loop'));
 assert.equal((await graph(p)).edges.length,3); await button(p,"Close dialog");
 // Arrange must also recover the viewport after a distant manual placement.
 await button(p,"Edit thought"); await p.click('.position-editor summary');
 await fill(p,'input[name="position-x"]','100000'); await fill(p,'input[name="position-y"]','100000');
 await button(p,"Save thought"); await noDialog(p);
 await button(p,"Close thought");
 await p.waitForNetworkIdle({idleTime:200,timeout:12000});
 for (let pan=0; pan<3; pan++) {
   await p.mouse.move(600,800); await p.mouse.down();
   await p.mouse.move(1300,800,{steps:12}); await p.mouse.up();
 }
 await button(p,"Arrange");
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('axiomer.arrangements.v1')).whiteboard),{});
 await p.waitForFunction(() => {
   const map=document.querySelector('.map-canvas').getBoundingClientRect();
   const nodes=[...document.querySelectorAll('.react-flow__node')];
   return nodes.length===3 && nodes.every(node=>{
     const box=node.getBoundingClientRect();
     return box.right>map.left && box.left<map.right && box.bottom>map.top && box.top<map.bottom;
   });
 });
 await p.click('.react-flow__node[data-id="v"]');
 if (await p.$('button[aria-label="Dismiss message"]')) await button(p,'Dismiss message');
 await p.screenshot({path:"test-results/whiteboard-desktop.png"});
 console.log("PASS local arrangement, view-only queue retention and cycle rejection");
 await button(p,"Sign in"); await fill(p,'input[name="name"]',"evidence-author"); await fill(p,'input[name="password"]',"a-strong-test-password"); await button(p,"Create account"); await noDialog(p);
 await button(p,"Publish");
 await p.$eval('textarea[name="note"]',e=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Evidence and connections');e.dispatchEvent(new Event('input',{bubbles:true}));});
 await button(p,"Publish revision"); await noDialog(p);
 const id=await p.evaluate(()=>JSON.parse(localStorage.getItem('axiomer.roadmaps.v2')).drafts[0].publishedId);
 const rctx=await browser.createBrowserContext(); const q=await rctx.newPage(); q.on('pageerror',e=>errors.push(e.message));
 await q.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); await q.goto(`${base}/argument/${id}`);
 await q.waitForSelector('.focus-sources a');
 assert.equal(await q.$eval('.focus-sources a',a=>a.href),'https://example.org/evidence');
 assert.equal(await q.$$eval('.connection-handle',els=>els.length),0);
 assert.equal(await q.$$eval('.react-flow__node.draggable',els=>els.length),0);
 assert.equal(await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await q.screenshot({path:'test-results/whiteboard-mobile.png'});
 await button(q,'Close thought'); await button(q,'Whole map');
 assert.equal(await q.$$eval('.connection-handle',els=>els.length),0);
 assert.equal(await q.$$eval('.react-flow__node.draggable',els=>els.length),0);
 assert.equal(await q.$$eval('button',els=>els.some(b=>b.textContent.trim()==='Arrange')),false);
 // Reserved imported IDs remain valid; they must never resolve to object prototypes.
 const reserved={schema:2,anchor:"__proto__",nodes:[{id:"__proto__",text:"An imported value",kind:"value"},{id:"constructor",text:"An imported reason",kind:null}],edges:[{id:"reserved-edge",from:"__proto__",to:"constructor",label:""}]};
 await p.evaluate(reserved=>{
   localStorage.setItem('axiomer.roadmaps.v2',JSON.stringify({drafts:[{id:'__proto__',title:'Reserved IDs',graph:reserved,updated:new Date().toISOString()}],activeDraftId:'__proto__',queue:null}));
   localStorage.setItem('axiomer.arrangements.v1','{"__proto__":{"constructor":{"x":25,"y":160}}}');
 }, reserved);
 await p.reload(); await p.waitForSelector('.thought-content');
 await button(p,'Close thought'); await p.waitForNetworkIdle({idleTime:200,timeout:12000});
 await p.click('.react-flow__node[data-id="constructor"]'); await button(p,'Edit thought');
 await p.click('.position-editor summary'); await fill(p,'input[name="position-x"]','80'); await fill(p,'input[name="position-y"]','180');
 await button(p,'Save thought'); await noDialog(p);
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('axiomer.arrangements.v1'))['__proto__'].constructor),{x:80,y:180});
 assert.deepEqual(await graph(p),reserved);
 assert.deepEqual(errors,[]);
 writeFileSync('test-results/whiteboard-verification.json',JSON.stringify({passed:true,checks:['source attach/reload/public read-only','direct pointer connection','edge label/remove/undo','drag view-only persistence','numeric reposition alternative','view-only and unchanged-edge saves retain pending AI review','cycle rejection','distant layout and pointer pan recover through Arrange','read-only overview has no handles/drag/Arrange','reserved imported thought and draft IDs','mobile layout'],liveInference:false},null,2));
 console.log('PASS: evidence whiteboard, direct connections, local arrangement, read-only sharing and mobile layout. No live inference.');
} catch(e) {
 console.error('whiteboard failure', e);
 for(const page of await browser.pages()) console.error(await page.evaluate(()=>document.body.innerText).catch(()=>''));
 for(const page of await browser.pages()) if(!page.isClosed()) await page.screenshot({path:'test-results/whiteboard-failure.png'}).catch(()=>{});
 throw e;
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
