#!/usr/bin/env node
// Axiomer graph CLI — a headless door into the SAME pure engine the app uses,
// so a terminal AI agent (Claude Code, etc.) can build the argument tree with
// full guardrails instead of blindly hand-editing JSON.
//
//   npm run graph:validate [-- <file>]        strict schema + integrity check
//   npm run graph:doctor   [-- <file>]        print the organize worklist
//   npm run graph:apply    -- <ops.json> [--graph <file>] [--dry-run]
//   npm run graph:add      -- --parent <id> --type <type> --content "…" \
//                             [--edge <edgeType>] [--kind <contentKind>] [--dry-run]
//
// Everything routes through io.ts (validate/parse/export) and proposals.ts
// (validateOp/applyOp) — the exact attachment-matrix / terminal / status
// rules the UI enforces. Invalid moves are rejected with a reason and never
// written. The default target is the canonical graph client/public/graph.json.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { exportGraph, parseGraph, validateGraph } from "../client/src/lib/io";
import { applyOp, validateOp, type ProposalOp } from "../client/src/lib/proposals";
import { getWorkItems, describeWorkItem } from "../client/src/lib/organize";
import { getRoots, getTerminals } from "../client/src/lib/graph";
import type { Graph } from "../client/src/lib/types";

const CANONICAL = "client/public/graph.json";

function die(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function readGraph(file: string): Graph {
  let text: string;
  try {
    text = readFileSync(resolve(file), "utf8");
  } catch {
    die(`could not read ${file}`);
  }
  try {
    return parseGraph(text);
  } catch (err) {
    die(`${file} is not a valid graph: ${(err as Error).message}`);
  }
}

function writeGraph(file: string, graph: Graph): void {
  // Re-validate before writing: never persist something the app would reject.
  validateGraph(graph);
  writeFileSync(resolve(file), exportGraph(graph));
}

// Tiny flag parser: --key value / --flag.
function parseFlags(argv: string[]): {
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else {
        flags[key] = next;
        i++;
      }
    } else positional.push(a);
  }
  return { positional, flags };
}

function cmdValidate(file: string): void {
  const graph = readGraph(file);
  const roots = getRoots(graph);
  const terminals = getTerminals(graph);
  console.log(
    `✓ ${file} is valid — ${graph.nodes.length} nodes, ${graph.edges.length} edges, ` +
      `${roots.length} root${roots.length === 1 ? "" : "s"}, ${terminals.length} terminal${terminals.length === 1 ? "" : "s"}.`,
  );
}

function cmdDoctor(file: string): void {
  const graph = readGraph(file);
  const items = getWorkItems(graph);
  if (items.length === 0) {
    console.log("✓ Nothing to organize — grounded, no unanswered attacks, no duplicates.");
    return;
  }
  console.log(`${items.length} item${items.length === 1 ? "" : "s"} on the worklist (worst first):\n`);
  for (const item of items) console.log(`  • ${describeWorkItem(item)}`);
}

function applyOps(graph: Graph, ops: ProposalOp[], dryRun: boolean): Graph {
  let current = graph;
  let accepted = 0;
  ops.forEach((op, i) => {
    const check = validateOp(current, op);
    if (!check.ok) {
      console.log(`  ✗ op[${i}] ${op.op}: ${check.reason}`);
      return;
    }
    current = applyOp(current, op);
    accepted++;
    console.log(`  ✓ op[${i}] ${op.op} applied`);
  });
  console.log(
    `\n${accepted}/${ops.length} op${ops.length === 1 ? "" : "s"} applied${dryRun ? " (dry run — not written)" : ""}.`,
  );
  return current;
}

function cmdApply(opsFile: string, graphFile: string, dryRun: boolean): void {
  if (!opsFile) die("usage: graph:apply -- <ops.json> [--graph <file>] [--dry-run]");
  let payload: unknown;
  try {
    payload = JSON.parse(readFileSync(resolve(opsFile), "utf8"));
  } catch (err) {
    die(`could not read ops file ${opsFile}: ${(err as Error).message}`);
  }
  // Accept either a bare ProposalOp[] or a { ops: [...] } proposal envelope.
  const ops = (
    Array.isArray(payload) ? payload : (payload as { ops?: unknown }).ops
  ) as ProposalOp[] | undefined;
  if (!Array.isArray(ops)) die("ops file must be a JSON array of ops, or { \"ops\": [...] }");

  const graph = readGraph(graphFile);
  const next = applyOps(graph, ops, dryRun);
  if (!dryRun) {
    writeGraph(graphFile, next);
    console.log(`Wrote ${graphFile}.`);
  }
}

function cmdAdd(flags: Record<string, string | boolean>, dryRun: boolean): void {
  const parentId = flags.parent;
  const type = flags.type;
  const content = flags.content;
  if (typeof parentId !== "string" || typeof type !== "string" || typeof content !== "string")
    die('usage: graph:add -- --parent <id> --type <type> --content "…" [--edge <e>] [--kind <k>]');
  const op = {
    op: "add-node",
    parentId,
    type,
    content,
    ...(typeof flags.edge === "string" ? { edgeType: flags.edge } : {}),
    ...(typeof flags.kind === "string" ? { contentKind: flags.kind } : {}),
  } as ProposalOp;
  const graphFile = typeof flags.graph === "string" ? flags.graph : CANONICAL;
  const graph = readGraph(graphFile);
  const next = applyOps(graph, [op], dryRun);
  if (!dryRun) {
    writeGraph(graphFile, next);
    console.log(`Wrote ${graphFile}.`);
  }
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseFlags(rest);
  const dryRun = flags["dry-run"] === true;
  const graphFile = typeof flags.graph === "string" ? flags.graph : CANONICAL;

  switch (command) {
    case "validate":
      cmdValidate(positional[0] ?? graphFile);
      break;
    case "doctor":
      cmdDoctor(positional[0] ?? graphFile);
      break;
    case "apply":
      cmdApply(positional[0], graphFile, dryRun);
      break;
    case "add":
      cmdAdd(flags, dryRun);
      break;
    default:
      die(
        `unknown command "${command ?? ""}". Commands: validate | doctor | apply | add`,
      );
  }
}

main();
