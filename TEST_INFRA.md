# E2E Test Infra: Axiomer

## Test Philosophy
- Opaque-box, requirement-driven testing derived from `ORIGINAL_REQUEST.md`.
- Decoupled from internal React component rendering implementation details; tests exercise core APIs, serialization formats, epistemic evaluation, MCP tool outputs, and end-to-end user workflows.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Scenarios.

## Feature Inventory & Test Coverage
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) |
|---|---------|---------------------|:-----------------:|:-----------------:|:----------------------:|
| 1 | 10-Node Ontology & 5 Edge Types | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 2 | Multi-Hop Recursive Grounding | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 3 | Dung Acceptability & Conflict Evaluation | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | Decoupled Ontology Rules | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | Source Citation Grounding | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 6 | Project & Branch Lifecycle | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 7 | Bidirectional JSON & Markdown I/O | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 8 | URL Hash Sharing & Read-only Mode | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 9 | MCP Server Tools | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 10 | Agent Discovery (`llms.txt`) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 11 | Strict 2-Row Header & Toolbar Layout | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 12 | Responsive Outline View & Wrapping | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 13 | Smooth Map Canvas & Layout Sync | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 14 | Calm 6-Family Design Tokens & SVGs | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Vitest (`npm test` / `npx vitest run tests/e2e/`)
- **Location**: `tests/e2e/` (comprehensive suites across Tiers 1-4)
- **Invocation**: `npm test` executes all unit and E2E test suites with 0 failures
- **Pass/Fail Semantics**: Strict deterministic assertions, exit code 0, 100% passing tests.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Trolley Problem Ethical Dilemma | Claims, Premise, Conflict, Value (Utilitarian vs Deontology), Grounding | High |
| 2 | Complex Policy Debate (Carbon Tax) | Multi-hop arguments, Citations (Sources), Limits, Bedrock, Preference | High |
| 3 | Branching Exploration & Merge Analysis | Project/branch lifecycle, branch switching, difference tracking | Medium |
| 4 | Roundtrip Interoperability (JSON & Markdown) | Export to Markdown, parse back to Graph, verify grounding invariance | High |
| 5 | Autonomous Agent Dialectic Analysis | MCP server tools (`get_grounding_gaps`, `get_acceptability`, `propose_node`) | High |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (14 features × 5 = ≥70 tests)
- Tier 2: ≥5 boundary/edge test cases per feature (14 features × 5 = ≥70 tests)
- Tier 3: ≥14 pairwise cross-feature combination tests
- Tier 4: ≥5 comprehensive real-world application scenarios
- Total Target: ≥160 test cases
