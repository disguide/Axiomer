# Test Ready: Axiomer Comprehensive E2E Test Suite

## Test Suite Execution
- **Runner Command**: `npm test` (or `npx vitest run tests/e2e/`)
- **Typecheck Command**: `npm run typecheck`
- **Build Command**: `npm run build`
- **Environment**: Node / Vitest
- **Total Test Files**: 32 files (30 E2E test files under `tests/e2e/` + 2 unit test files in `client/src/lib/`)
- **Total Tests Executed**: 245 tests
- **Pass Rate**: 100% (245/245 passing, 0 failing)

---

## Test Inventory & Tiered Coverage Breakdown

### Tier 1: Feature Coverage (73 tests)
| # | Feature | Test File | Test Cases | Status |
|---|---------|-----------|:----------:|:------:|
| 1 | 10-Node Ontology & 5 Edge Types | `tests/e2e/tier1-features/tier1-01-ontology-edges.test.ts` | 6 | PASS |
| 2 | Multi-Hop Recursive Grounding | `tests/e2e/tier1-features/tier1-02-recursive-grounding.test.ts` | 5 | PASS |
| 3 | Dung Acceptability & Conflict Evaluation | `tests/e2e/tier1-features/tier1-03-dung-acceptability.test.ts` | 6 | PASS |
| 4 | Decoupled Ontology Rules | `tests/e2e/tier1-features/tier1-04-decoupled-ontology.test.ts` | 5 | PASS |
| 5 | Source Citation Grounding | `tests/e2e/tier1-features/tier1-05-source-citations.test.ts` | 5 | PASS |
| 6 | Project & Branch Lifecycle | `tests/e2e/tier1-features/tier1-06-project-branch-lifecycle.test.ts` | 5 | PASS |
| 7 | Bidirectional JSON & Markdown I/O | `tests/e2e/tier1-features/tier1-07-bidirectional-io.test.ts` | 6 | PASS |
| 8 | URL Hash Sharing & Read-only Mode | `tests/e2e/tier1-features/tier1-08-url-sharing-readonly.test.ts` | 5 | PASS |
| 9 | MCP Server Tools | `tests/e2e/tier1-features/tier1-09-mcp-server-tools.test.ts` | 5 | PASS |
| 10 | Agent Discovery (`llms.txt`) | `tests/e2e/tier1-features/tier1-10-agent-discovery.test.ts` | 5 | PASS |
| 11 | Strict 2-Row Header & Toolbar Layout | `tests/e2e/tier1-features/tier1-11-header-toolbar-layout.test.ts` | 5 | PASS |
| 12 | Responsive Outline View & Wrapping | `tests/e2e/tier1-features/tier1-12-outline-view.test.ts` | 5 | PASS |
| 13 | Smooth Map Canvas & Layout Sync | `tests/e2e/tier1-features/tier1-13-map-canvas-layout.test.ts` | 5 | PASS |
| 14 | Calm 6-Family Design Tokens & SVGs | `tests/e2e/tier1-features/tier1-14-design-tokens-svgs.test.ts` | 5 | PASS |

### Tier 2: Boundary & Corner Cases (80 tests)
| # | Feature Boundary | Test File | Test Cases | Status |
|---|------------------|-----------|:----------:|:------:|
| 1 | Ontology & Edge Types Boundaries | `tests/e2e/tier2-boundary/tier2-01-ontology-boundary.test.ts` | 5 | PASS |
| 2 | Deep Chains, Cycles & Disconnected Nodes | `tests/e2e/tier2-boundary/tier2-02-grounding-boundary.test.ts` | 5 | PASS |
| 3 | Self-Attacks, Odd/Even Cycles & Disconnected Graphs | `tests/e2e/tier2-boundary/tier2-03-acceptability-boundary.test.ts` | 5 | PASS |
| 4 | Decoupled Rules, Custom Schemas & Extreme String Cases | `tests/e2e/tier2-boundary/tier2-04-decoupled-rules-boundary.test.ts` | 5 | PASS |
| 5 | Extreme URLs, Percent Encoding & Citation Limits | `tests/e2e/tier2-boundary/tier2-05-source-citation-boundary.test.ts` | 5 | PASS |
| 6 | 50+ Branches, Cyclic Topologies & Negative Coords | `tests/e2e/tier2-boundary/tier2-06-project-branch-boundary.test.ts` | 5 | PASS |
| 7 | 500-Node Payloads, Invalid JSON & Cyclic Markdown | `tests/e2e/tier2-boundary/tier2-07-io-boundary.test.ts` | 5 | PASS |
| 8 | Large Payloads, Emojis, Unicode & Corrupted Hashes | `tests/e2e/tier2-boundary/tier2-08-url-sharing-boundary.test.ts` | 5 | PASS |
| 9 | Missing Nodes, Ghost Parents & 30-Node Forest Gaps | `tests/e2e/tier2-boundary/tier2-09-mcp-tools-boundary.test.ts` | 10 | PASS |
| 10 | Noisy Markdown, Missing Sections & Agent Metadata | `tests/e2e/tier2-boundary/tier2-10-agent-discovery-boundary.test.ts` | 10 | PASS |
| 11 | 100 Ungrounded Claims, Extreme Depths & Empty Stats | `tests/e2e/tier2-boundary/tier2-11-header-toolbar-boundary.test.ts` | 5 | PASS |
| 12 | 20-Level Nesting, Cyclic Parents & Shared Terminals | `tests/e2e/tier2-boundary/tier2-12-outline-view-boundary.test.ts` | 5 | PASS |
| 13 | Single Node Dagre, 50 Roots & Cyclic Highlights | `tests/e2e/tier2-boundary/tier2-13-map-canvas-boundary.test.ts` | 5 | PASS |
| 14 | Color Formats, Prompts, Non-Duplicate Accents | `tests/e2e/tier2-boundary/tier2-14-design-tokens-boundary.test.ts` | 5 | PASS |

### Tier 3: Cross-Feature Pairwise Combinations (19 tests)
- **File**: `tests/e2e/tier3-combinations/tier3-pairwise-combinations.test.ts`
- **Coverage**:
  1. Branching + JSON Export/Import isolation
  2. Grounding + Acceptability + Value Clashes dynamic interplay
  3. Multi-Hop Dialectics + URL Hash compression fidelity
  4. Dagre Map Layout + Markdown hierarchical serialization alignment
  5. Decoupled Rules + Acceptability on migrated legacy schema
  6. Source Citation Grounding + Status Profile archetype calculation
  7. Shared Terminal Values across divergent branches + Subtree deletion
  8. Premise Authoring + Deduplication Similarity & Linking
  9. Conflict Reinstatement + Grounding Gap resolution
  10. Floating Nodes + Edge Connection + Dagre flow layout
  11. Project Multi-Root export to Markdown with section dividers
  12. Read-Only Guard + URL Decompression state immutability
  13. Agent MCP Tooling (`propose_node` / `get_grounding_gaps`) + Schema validation
  14. Design Tokens & Ontology metadata consistency across 10 types

### Tier 4: Real-World Application Scenarios (10 tests)
- **File**: `tests/e2e/tier4-scenarios/tier4-real-world-scenarios.test.ts`
- **Scenarios**:
  1. **Trolley Problem Ethical Dilemma**: Utilitarian vs Deontological derivation, Kantian objection, grounding verification, value clash detection, and Dung acceptability.
  2. **Complex Policy Debate**: Carbon fee & dividend with empirical IPCC citations, progressive rebates, epistemic limits, subjective preferences, and markdown serialization.
  3. **Branching Exploration & Merge Analysis**: Healthcare reform branching into Single-Payer vs Market Voucher, difference analysis, and synthesized merge.
  4. **Roundtrip Interoperability**: Multi-root graph with all node types exported to JSON, Markdown, and URL hash with grounding invariance.
  5. **Autonomous Agent Dialectic Analysis**: Full MCP multi-turn reasoning loop (`get_roots` -> `propose_node` support -> `propose_node` conflict -> `propose_node` defender -> `propose_node` terminal limit -> acceptability evaluation -> final audit).

---

## Verification Commands
```bash
# Run all unit and E2E tests
npm test

# Run only E2E test suites
npx vitest run tests/e2e/

# Run TypeScript typecheck
npm run typecheck

# Run production build
npm run build
```
