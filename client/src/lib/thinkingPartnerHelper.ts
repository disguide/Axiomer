/**
 * @file thinkingPartnerHelper.ts
 * @description ThinkingPartner class implementing the controlled AI collaboration framework.
 * 
 * Provides runtime functionality for:
 * 1) Selecting collaboration mode based on user intent and slash commands.
 * 2) Preserving compact working context, boundaries, and immediate correction replacement.
 * 3) Applying structured reasoning methods, specialist lenses, and coherence checks.
 * 4) Enforcing strict approval boundaries and authority checks before external or durable actions.
 * 
 * Derived from the thinking-partner-framework specification.
 */

// ============================================================================
// Types & Contracts
// ============================================================================

/**
 * Primary collaboration modes defining the AI's behavioral boundary.
 * Only one primary mode is active at any time.
 */
export type CollaborationMode =
  | 'listen'      // Give space, reflect understanding, ask <= 1 question, no unsolicited advice
  | 'clarify'     // Resolve one material ambiguity in term, goal, or scope
  | 'exchange'    // Normal discussion, perspective sharing, exploring viewpoints
  | 'brainstorm'  // Generate distinct options/directions before judging
  | 'challenge'   // Stress-test an idea, claim, plan, or design fairly
  | 'research'    // Gather outside evidence and verify claims (known vs inferred vs unknown)
  | 'decide'      // Compare real options against criteria and make transparent recommendation
  | 'plan'        // Sequence an approved direction into milestones without executing
  | 'act';        // Perform a specifically authorized task safely within stated scope

/**
 * Authority levels defining what the AI is permitted to do.
 * Research does not grant recommendation authority; recommendation does not grant execution.
 */
export type AuthorityLevel =
  | 'discuss'     // Explain, explore, and exchange views
  | 'recommend'   // Give a reasoned suggestion
  | 'select'      // Make a choice only when the user delegates it
  | 'execute';    // Perform approved work only within stated scope

/**
 * Status of the active working goal.
 */
export type GoalStatus =
  | 'unknown'
  | 'provisional'
  | 'confirmed'
  | 'blocked'
  | 'complete';

/**
 * Confidence level for assumptions and inferences.
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Evidence categorization level.
 */
export type EvidenceQuality = 'verified' | 'provisional' | 'unsupported';

/**
 * Core reasoning frameworks that alter how a problem is examined inside an active mode.
 */
export type ReasoningMethod =
  | 'contextual'      // Understand meaning and context first before suggesting
  | 'socratic'        // Identify the single most important uncertainty and ask focused question
  | 'analytical'      // Break down components, mechanisms, relationships, assumptions
  | 'creative'        // Produce distinct, non-obvious alternatives with trade-offs
  | 'critical'        // Stress-test assumptions, identify weak points and mitigations
  | 'systems'         // Map dependencies, feedback loops, incentives, second-order effects
  | 'evidence-first'  // Separate facts, inferences, judgments, and unknowns
  | 'comparative'     // Multi-criteria trade-off comparison
  | 'procedural';     // Step-by-step verification of an authorized task

/**
 * Specialist lenses that fit inside core reasoning frameworks.
 */
export type SpecialistLens =
  | 'first-principles'       // Reduce to core truths before using familiar assumptions
  | 'root-cause'             // Find the actionable root cause rather than visible symptom
  | 'inversion'              // Reason backward from failure conditions
  | 'pre-mortem'             // Assume failure in 6 months and diagnose why
  | 'second-order-effects'   // Trace consequences beyond the obvious first effect
  | 'scenario-planning'      // Best, likely, and bad cases with trigger signals
  | 'assumption-check'       // Identify pivotal assumptions that could invalidate conclusion
  | 'counterexample-search'  // Find strong cases where the conclusion fails
  | 'decision-audit'         // Audit alternatives, hidden values, reversibility
  | 'user-task'              // Focus on what the user is trying to accomplish at that moment
  | 'ux-coherence'           // Check UI against user's core task flow rather than visual taste
  | 'accessibility'          // Verify usability across varied abilities, devices, contexts
  | 'evidence-vs-judgment'   // Separate verified facts from subjective opinions
  | 'coherence-review';      // Verify alignment with original goals, constraints, and corrections

/**
 * Action classifications for boundary enforcement.
 */
export type ActionType =
  | 'read'
  | 'inspect'
  | 'draft'
  | 'durable-write'
  | 'file-delete'
  | 'publish'
  | 'send-message'
  | 'purchase'
  | 'deploy'
  | 'system-command'
  | 'other-external';

/**
 * Risk levels for proposed operations.
 */
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// State & Record Structures
// ============================================================================

export interface Goal {
  outcome: string;
  status: GoalStatus;
  successCriteria: string[];
}

export interface Boundaries {
  constraints: string[];
  nonGoals: string[];
  authority: AuthorityLevel;
  activeMode: CollaborationMode;
}

export interface AssumptionRecord {
  id: string;
  assumption: string;
  confidence: ConfidenceLevel;
  createdAt: string;
}

export interface CorrectionRecord {
  id: string;
  original: string;
  corrected: string;
  reason?: string;
  timestamp: string;
}

export interface EvidenceRecord {
  id: string;
  claim: string;
  source?: string;
  limits?: string;
  quality: EvidenceQuality;
}

export interface CurrentUnderstanding {
  factsAndPriorities: string[];
  assumptions: AssumptionRecord[];
  corrections: CorrectionRecord[];
  evidence: EvidenceRecord[];
}

export interface DecisionRecord {
  id: string;
  decision: string;
  rationale: string;
  timestamp: string;
}

export interface RejectedAlternative {
  id: string;
  alternative: string;
  reason: string;
}

export interface OpenQuestion {
  id: string;
  question: string;
  answered: boolean;
  answer?: string;
}

export interface DecisionsAndOpenItems {
  decisions: DecisionRecord[];
  rejectedAlternatives: RejectedAlternative[];
  openQuestions: OpenQuestion[];
  largestGap?: string;
  smallestNextStep?: string;
}

/**
 * Compact working state record according to SHARED_STATE.md.
 * Keeps only state that helps active work; never acts as a full transcript or permanent profile.
 */
export interface SharedState {
  goal: Goal;
  boundaries: Boundaries;
  currentUnderstanding: CurrentUnderstanding;
  decisionsAndOpenItems: DecisionsAndOpenItems;
}

/**
 * Output of mode selection inference.
 */
export interface ModeSelectionResult {
  mode: CollaborationMode;
  authority: AuthorityLevel;
  matchedSlashCommand?: string;
  confidence: ConfidenceLevel;
  rationale: string;
  recommendedQuestion?: string;
  provisionalAssumption?: string;
}

/**
 * Result of applying a reasoning method or specialist lens.
 */
export interface ReasoningMethodResult {
  method: ReasoningMethod | SpecialistLens;
  lens?: SpecialistLens;
  summary: string;
  keyFindings: string[];
  assumptionsIdentified: string[];
  tradeoffsOrRisks: string[];
  smallestNextStep?: string;
}

/**
 * Coherence review check result against goal, boundaries, and corrections.
 */
export interface CoherenceReviewResult {
  isCoherent: boolean;
  mismatches: string[];
  smallestRepair?: string;
  necessaryQuestion?: string;
}

/**
 * Request describing an external or durable action.
 */
export interface ExternalActionRequest {
  actionType: ActionType | string;
  target: string;
  description: string;
  isDurableOrExternal?: boolean;
  riskLevel?: RiskLevel;
}

/**
 * Approval boundary check result.
 */
export interface ApprovalCheckResult {
  isAllowed: boolean;
  requiresApproval: boolean;
  approvalGranted: boolean;
  currentAuthority: AuthorityLevel;
  requiredAuthority: AuthorityLevel;
  riskLevel: RiskLevel;
  reason: string;
  approvalToken?: string;
}

/**
 * Record of an explicit user approval token.
 */
export interface ApprovalRecord {
  token: string;
  action: ExternalActionRequest;
  requestedAt: string;
  grantedAt?: string;
  status: 'pending' | 'granted' | 'rejected';
}

// ============================================================================
// Constants & Method Mappings
// ============================================================================

export const MODE_RECOMMENDED_METHODS: Record<CollaborationMode, readonly ReasoningMethod[]> = {
  listen: ['contextual'],
  clarify: ['contextual', 'socratic'],
  exchange: ['contextual', 'analytical', 'systems', 'comparative'],
  brainstorm: ['creative'],
  challenge: ['analytical', 'critical', 'systems', 'evidence-first'],
  research: ['evidence-first', 'critical'],
  decide: ['critical', 'systems', 'comparative'],
  plan: ['analytical', 'systems'],
  act: ['procedural'],
};

export const EXTERNAL_ACTION_TYPES: ReadonlySet<string> = new Set([
  'durable-write',
  'file-delete',
  'publish',
  'send-message',
  'purchase',
  'deploy',
  'system-command',
  'other-external',
]);

// ============================================================================
// ThinkingPartner Implementation
// ============================================================================

/**
 * ThinkingPartner coordinates structured, controlled AI collaboration.
 * 
 * It manages:
 * - One primary active collaboration mode and authority level at a time.
 * - Compact shared state with immediate replacement of stale meaning upon user correction.
 * - Single-lens reasoning methods avoiding cognitive bloat.
 * - Strict approval gating before any durable or external action.
 */
export class ThinkingPartner {
  private state: SharedState;
  private activeMethod: (ReasoningMethod | SpecialistLens) | null = null;
  private approvalRegistry: Map<string, ApprovalRecord> = new Map();

  /**
   * Initializes a new ThinkingPartner instance.
   * @param initialState Optional initial state overrides.
   */
  constructor(initialState?: Partial<SharedState>) {
    this.state = {
      goal: {
        outcome: initialState?.goal?.outcome || '',
        status: initialState?.goal?.status || 'unknown',
        successCriteria: initialState?.goal?.successCriteria ? [...initialState.goal.successCriteria] : [],
      },
      boundaries: {
        constraints: initialState?.boundaries?.constraints ? [...initialState.boundaries.constraints] : [],
        nonGoals: initialState?.boundaries?.nonGoals ? [...initialState.boundaries.nonGoals] : [],
        authority: initialState?.boundaries?.authority || 'discuss',
        activeMode: initialState?.boundaries?.activeMode || 'exchange',
      },
      currentUnderstanding: {
        factsAndPriorities: initialState?.currentUnderstanding?.factsAndPriorities
          ? [...initialState.currentUnderstanding.factsAndPriorities]
          : [],
        assumptions: initialState?.currentUnderstanding?.assumptions
          ? [...initialState.currentUnderstanding.assumptions]
          : [],
        corrections: initialState?.currentUnderstanding?.corrections
          ? [...initialState.currentUnderstanding.corrections]
          : [],
        evidence: initialState?.currentUnderstanding?.evidence
          ? [...initialState.currentUnderstanding.evidence]
          : [],
      },
      decisionsAndOpenItems: {
        decisions: initialState?.decisionsAndOpenItems?.decisions
          ? [...initialState.decisionsAndOpenItems.decisions]
          : [],
        rejectedAlternatives: initialState?.decisionsAndOpenItems?.rejectedAlternatives
          ? [...initialState.decisionsAndOpenItems.rejectedAlternatives]
          : [],
        openQuestions: initialState?.decisionsAndOpenItems?.openQuestions
          ? [...initialState.decisionsAndOpenItems.openQuestions]
          : [],
        largestGap: initialState?.decisionsAndOpenItems?.largestGap,
        smallestNextStep: initialState?.decisionsAndOpenItems?.smallestNextStep,
      },
    };
  }

  // ==========================================================================
  // 1) Collaboration Mode Selection
  // ==========================================================================

  /**
   * Selects the appropriate collaboration mode based on user intent and optional slash commands.
   * 
   * Modes represent behavioral boundaries, not tone. The framework adheres to the following rules:
   * - One primary mode is active at a time.
   * - Natural-language requests or explicit slash commands (/listen, /challenge, etc.) select the matching mode.
   * - If intent is materially ambiguous, asks one focused question or states a provisional assumption.
   * - Mode never silently blends into another (e.g. listening never silently becomes advice).
   * 
   * @param input Raw user prompt or command string.
   * @returns ModeSelectionResult containing the chosen mode, authority, rationale, and any needed question.
   */
  public selectCollaborationMode(input: string): ModeSelectionResult {
    const trimmed = input.trim();

    // Check for explicit slash commands
    const slashMatch = trimmed.match(/^\/(listen|clarify|exchange|brainstorm|challenge|research|decide|plan|act)\b/i);
    if (slashMatch) {
      const mode = slashMatch[1].toLowerCase() as CollaborationMode;
      const authority = this.getDefaultAuthorityForMode(mode);
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        matchedSlashCommand: `/${mode}`,
        confidence: 'high',
        rationale: `Explicit slash command /${mode} provided by user.`,
      };
    }

    const lower = trimmed.toLowerCase();

    // Heuristics based on thinking-partner-framework/skill/references/runtime/MODE_SELECTION.md
    if (
      lower.startsWith('just listen') ||
      lower.includes('thinking aloud') ||
      lower.includes('hear me out') ||
      lower.includes('let me vent') ||
      lower.includes('listen to this')
    ) {
      const mode: CollaborationMode = 'listen';
      const authority: AuthorityLevel = 'discuss';
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        confidence: 'high',
        rationale: 'User expressed intent to think aloud or be heard without unsolicited advice.',
      };
    }

    if (
      lower.includes('what do you mean') ||
      lower.includes('help me clarify') ||
      lower.includes('define what') ||
      lower.includes('unclear what') ||
      lower.includes('work out what i mean')
    ) {
      const mode: CollaborationMode = 'clarify';
      const authority: AuthorityLevel = 'discuss';
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        confidence: 'high',
        rationale: 'Meaning, scope, or key term is materially unclear and requires focused clarification.',
        recommendedQuestion: 'What is the single most important definition or outcome we should align on first?',
      };
    }

    if (
      lower.includes('brainstorm') ||
      lower.includes('give me ideas') ||
      lower.includes('different directions') ||
      lower.includes('options for') ||
      lower.includes('explore alternatives') ||
      lower.includes('new angles')
    ) {
      const mode: CollaborationMode = 'brainstorm';
      const authority: AuthorityLevel = 'discuss';
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        confidence: 'high',
        rationale: 'User requested divergent generation of distinct options before judging.',
      };
    }

    if (
      lower.includes('stress test') ||
      lower.includes('try to break') ||
      lower.includes('poke holes') ||
      lower.includes('challenge this') ||
      lower.includes('what could go wrong') ||
      lower.includes('weak points') ||
      lower.includes('devil\'s advocate')
    ) {
      const mode: CollaborationMode = 'challenge';
      const authority: AuthorityLevel = 'discuss';
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        confidence: 'high',
        rationale: 'User requested stress-testing of assumptions, design, or claims.',
      };
    }

    if (
      lower.includes('research') ||
      lower.includes('find evidence') ||
      lower.includes('verify this') ||
      lower.includes('look up') ||
      lower.includes('what does the data say') ||
      lower.includes('citations')
    ) {
      const mode: CollaborationMode = 'research';
      const authority: AuthorityLevel = 'discuss';
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        confidence: 'high',
        rationale: 'User requested outside evidence gathering or factual verification.',
      };
    }

    if (
      lower.includes('help me choose') ||
      lower.includes('help me decide') ||
      lower.includes('recommend') ||
      lower.includes('which option is better') ||
      lower.includes('compare these') ||
      lower.includes('weigh the trade-offs')
    ) {
      const mode: CollaborationMode = 'decide';
      const authority: AuthorityLevel = 'recommend';
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        confidence: 'high',
        rationale: 'User requested comparison of viable options against criteria with recommendation.',
      };
    }

    if (
      lower.includes('make a plan') ||
      lower.includes('roadmap') ||
      lower.includes('milestones') ||
      lower.includes('break this down into steps') ||
      lower.includes('sequence this')
    ) {
      const mode: CollaborationMode = 'plan';
      const authority: AuthorityLevel = 'discuss';
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        confidence: 'high',
        rationale: 'User requested sequencing an approved direction into structured milestones.',
      };
    }

    if (
      lower.startsWith('execute') ||
      lower.startsWith('run ') ||
      lower.startsWith('apply ') ||
      lower.includes('do this task') ||
      lower.includes('perform the following')
    ) {
      const mode: CollaborationMode = 'act';
      const authority: AuthorityLevel = 'execute';
      this.state.boundaries.activeMode = mode;
      this.state.boundaries.authority = authority;
      return {
        mode,
        authority,
        confidence: 'medium',
        rationale: 'User explicitly requested performing an authorized task.',
        provisionalAssumption: 'Action will be restricted to stated scope and require approval if durable.',
      };
    }

    // Default to Exchange for standard collaborative discussion
    const defaultMode: CollaborationMode = 'exchange';
    const defaultAuthority: AuthorityLevel = 'discuss';
    this.state.boundaries.activeMode = defaultMode;
    this.state.boundaries.authority = defaultAuthority;

    return {
      mode: defaultMode,
      authority: defaultAuthority,
      confidence: 'medium',
      rationale: 'Standard collaborative discussion and perspective exchange.',
    };
  }

  /**
   * Sets the active collaboration mode and optional authority level directly.
   * @param mode Target collaboration mode.
   * @param authority Optional authority level. Defaults to mode baseline.
   */
  public setMode(mode: CollaborationMode, authority?: AuthorityLevel): void {
    this.state.boundaries.activeMode = mode;
    this.state.boundaries.authority = authority || this.getDefaultAuthorityForMode(mode);
  }

  /**
   * Returns the currently active collaboration mode.
   */
  public getActiveMode(): CollaborationMode {
    return this.state.boundaries.activeMode;
  }

  /**
   * Returns the current authority level.
   */
  public getAuthority(): AuthorityLevel {
    return this.state.boundaries.authority;
  }

  /**
   * Updates the authority level.
   * Mode and method never override authority; execution authority must be explicitly granted.
   * @param authority New authority level.
   */
  public setAuthority(authority: AuthorityLevel): void {
    this.state.boundaries.authority = authority;
  }

  // ==========================================================================
  // 2) Context & Correction Preservation
  // ==========================================================================

  /**
   * Retrieves the current immutable snapshot of shared state.
   */
  public getSharedState(): Readonly<SharedState> {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Updates the current working goal.
   * @param outcome Concise description of intended outcome.
   * @param status Goal confirmation status.
   * @param successCriteria Observable success criteria.
   */
  public updateGoal(outcome: string, status: GoalStatus = 'provisional', successCriteria: string[] = []): void {
    this.state.goal.outcome = outcome;
    this.state.goal.status = status;
    if (successCriteria.length > 0) {
      this.state.goal.successCriteria = [...successCriteria];
    }
  }

  /**
   * Adds an immutable constraint or non-negotiable boundary.
   * @param constraint Constraint description.
   */
  public addConstraint(constraint: string): void {
    const trimmed = constraint.trim();
    if (trimmed && !this.state.boundaries.constraints.includes(trimmed)) {
      this.state.boundaries.constraints.push(trimmed);
    }
  }

  /**
   * Adds an explicit non-goal to avoid unrequested scope expansion.
   * @param nonGoal Description of what is intentionally out of scope.
   */
  public addNonGoal(nonGoal: string): void {
    const trimmed = nonGoal.trim();
    if (trimmed && !this.state.boundaries.nonGoals.includes(trimmed)) {
      this.state.boundaries.nonGoals.push(trimmed);
    }
  }

  /**
   * Records a user-stated fact or priority.
   * @param fact Verified user fact.
   */
  public recordFact(fact: string): void {
    const trimmed = fact.trim();
    if (trimmed && !this.state.currentUnderstanding.factsAndPriorities.includes(trimmed)) {
      this.state.currentUnderstanding.factsAndPriorities.push(trimmed);
    }
  }

  /**
   * Applies an explicit user correction, immediately replacing earlier stale meaning.
   * 
   * In accordance with SHARED_STATE.md and GLOBAL_CORE.md:
   * - A later explicit correction immediately replaces an earlier inference.
   * - Stale interpretations or conflicting assumptions are purged.
   * - The correction is logged with a timestamp for auditability.
   * 
   * @param original The prior misunderstood interpretation or claim.
   * @param corrected The user-provided corrected truth or direction.
   * @param reason Optional rationale explaining why the correction was made.
   * @returns The generated CorrectionRecord.
   */
  public applyCorrection(original: string, corrected: string, reason?: string): CorrectionRecord {
    const correctionRecord: CorrectionRecord = {
      id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      original: original.trim(),
      corrected: corrected.trim(),
      reason: reason?.trim(),
      timestamp: new Date().toISOString(),
    };

    this.state.currentUnderstanding.corrections.push(correctionRecord);

    // Purge or replace any contradictory assumptions
    this.state.currentUnderstanding.assumptions = this.state.currentUnderstanding.assumptions.filter(
      (a) => !a.assumption.toLowerCase().includes(original.toLowerCase())
    );

    // If the goal was impacted by the correction, mark status provisional to re-align
    if (this.state.goal.outcome.toLowerCase().includes(original.toLowerCase())) {
      this.state.goal.outcome = this.state.goal.outcome.replace(new RegExp(original, 'gi'), corrected);
      this.state.goal.status = 'provisional';
    }

    return correctionRecord;
  }

  /**
   * Records a working assumption with an explicit confidence level.
   * @param assumption Assumption statement.
   * @param confidence Confidence level ('low' | 'medium' | 'high').
   * @returns Assigned assumption record ID.
   */
  public recordAssumption(assumption: string, confidence: ConfidenceLevel = 'medium'): string {
    const id = `asmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.state.currentUnderstanding.assumptions.push({
      id,
      assumption: assumption.trim(),
      confidence,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  /**
   * Records evidence with source provenance and boundaries.
   * @param claim The claim supported or refuted by evidence.
   * @param quality Evidence quality ('verified' | 'provisional' | 'unsupported').
   * @param source Optional citation or origin.
   * @param limits Boundary or applicability limits of the evidence.
   * @returns Assigned evidence record ID.
   */
  public recordEvidence(
    claim: string,
    quality: EvidenceQuality = 'provisional',
    source?: string,
    limits?: string
  ): string {
    const id = `evd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.state.currentUnderstanding.evidence.push({
      id,
      claim: claim.trim(),
      source: source?.trim(),
      limits: limits?.trim(),
      quality,
    });
    return id;
  }

  /**
   * Records an explicit decision made and its rationale.
   * @param decision Decision statement.
   * @param rationale Reason for decision.
   * @param rejectedAlternatives Optional list of alternatives considered and rejected.
   * @returns Assigned decision record ID.
   */
  public recordDecision(
    decision: string,
    rationale: string,
    rejectedAlternatives?: Array<{ alternative: string; reason: string }>
  ): string {
    const id = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.state.decisionsAndOpenItems.decisions.push({
      id,
      decision: decision.trim(),
      rationale: rationale.trim(),
      timestamp: new Date().toISOString(),
    });

    if (rejectedAlternatives && rejectedAlternatives.length > 0) {
      for (const alt of rejectedAlternatives) {
        this.state.decisionsAndOpenItems.rejectedAlternatives.push({
          id: `rej-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          alternative: alt.alternative.trim(),
          reason: alt.reason.trim(),
        });
      }
    }
    return id;
  }

  /**
   * Adds an open question or material uncertainty blocking progress.
   * @param question The single focused question.
   * @returns Assigned question record ID.
   */
  public recordOpenQuestion(question: string): string {
    const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.state.decisionsAndOpenItems.openQuestions.push({
      id,
      question: question.trim(),
      answered: false,
    });
    return id;
  }

  /**
   * Resolves an open question with user-provided answer.
   * @param questionIdOrText ID or matching text of the question.
   * @param answer User's resolution.
   * @returns True if found and resolved.
   */
  public resolveOpenQuestion(questionIdOrText: string, answer: string): boolean {
    const item = this.state.decisionsAndOpenItems.openQuestions.find(
      (q) => q.id === questionIdOrText || q.question.toLowerCase().includes(questionIdOrText.toLowerCase())
    );
    if (item) {
      item.answered = true;
      item.answer = answer.trim();
      return true;
    }
    return false;
  }

  /**
   * Sets the largest current gap blocking outcome.
   * @param gap Description of the primary gap.
   */
  public setLargestGap(gap: string): void {
    this.state.decisionsAndOpenItems.largestGap = gap.trim();
  }

  /**
   * Sets the smallest valid next step.
   * @param step Description of next action.
   */
  public setSmallestNextStep(step: string): void {
    this.state.decisionsAndOpenItems.smallestNextStep = step.trim();
  }

  /**
   * Produces a compact markdown working summary matching SHARED_STATE.md schema.
   * Designed to be compact and show only what helps the user align or correct the work.
   */
  public getWorkingSummary(): string {
    const s = this.state;
    const lines: string[] = [
      '# Shared State Working Summary',
      '',
      '## GOAL',
      `- Outcome: ${s.goal.outcome || '(Not set)'}`,
      `- Status: ${s.goal.status}`,
      `- Success criteria: ${s.goal.successCriteria.length > 0 ? s.goal.successCriteria.join(', ') : 'none stated'}`,
      '',
      '## BOUNDARIES',
      `- Constraints: ${s.boundaries.constraints.length > 0 ? s.boundaries.constraints.join('; ') : 'none'}`,
      `- Non-goals: ${s.boundaries.nonGoals.length > 0 ? s.boundaries.nonGoals.join('; ') : 'none'}`,
      `- Authority: ${s.boundaries.authority}`,
      `- Active mode: ${s.boundaries.activeMode}`,
      '',
      '## CURRENT UNDERSTANDING',
      `- Facts & priorities: ${s.currentUnderstanding.factsAndPriorities.length > 0 ? s.currentUnderstanding.factsAndPriorities.join('; ') : 'none'}`,
      `- Assumptions (${s.currentUnderstanding.assumptions.length}): ${s.currentUnderstanding.assumptions.map((a) => `${a.assumption} [${a.confidence}]`).join('; ') || 'none'}`,
      `- Corrections (${s.currentUnderstanding.corrections.length}): ${s.currentUnderstanding.corrections.map((c) => `"${c.original}" → "${c.corrected}"`).join('; ') || 'none'}`,
      `- Evidence items: ${s.currentUnderstanding.evidence.length}`,
      '',
      '## DECISIONS AND OPEN ITEMS',
      `- Decisions made (${s.decisionsAndOpenItems.decisions.length}): ${s.decisionsAndOpenItems.decisions.map((d) => d.decision).join('; ') || 'none'}`,
      `- Open questions (${s.decisionsAndOpenItems.openQuestions.filter((q) => !q.answered).length} active): ${s.decisionsAndOpenItems.openQuestions.filter((q) => !q.answered).map((q) => q.question).join('; ') || 'none'}`,
      `- Largest current gap: ${s.decisionsAndOpenItems.largestGap || 'none'}`,
      `- Smallest next step: ${s.decisionsAndOpenItems.smallestNextStep || 'none'}`,
    ];
    return lines.join('\n');
  }

  /**
   * Resets temporary state while preserving baseline boundaries.
   */
  public resetContext(): void {
    this.state.goal = { outcome: '', status: 'unknown', successCriteria: [] };
    this.state.boundaries.constraints = [];
    this.state.boundaries.nonGoals = [];
    this.state.currentUnderstanding = {
      factsAndPriorities: [],
      assumptions: [],
      corrections: [],
      evidence: [],
    };
    this.state.decisionsAndOpenItems = {
      decisions: [],
      rejectedAlternatives: [],
      openQuestions: [],
      largestGap: undefined,
      smallestNextStep: undefined,
    };
    this.activeMethod = null;
    this.approvalRegistry.clear();
  }

  // ==========================================================================
  // 3) Reasoning Methods & Specialist Lenses
  // ==========================================================================

  /**
   * Applies a structured reasoning method or specialist lens to examine the active problem.
   * 
   * Method Principles (from FRAMEWORK_MENU.md and INDEX.md):
   * - A method alters HOW the problem is examined inside the active mode.
   * - A method NEVER overrides the active mode or authority.
   * - Default is one main method and one final coherence check; avoids stacking lenses.
   * 
   * @param methodOrLens Core method or specialist lens to apply.
   * @param promptOrContext Optional context or focus topic.
   * @returns ReasoningMethodResult containing findings, assumptions, trade-offs, and smallest next step.
   */
  public applyReasoningMethod(
    methodOrLens: ReasoningMethod | SpecialistLens,
    promptOrContext?: string
  ): ReasoningMethodResult {
    this.activeMethod = methodOrLens;
    const context = promptOrContext || this.state.goal.outcome || 'Current active task';

    switch (methodOrLens) {
      case 'contextual':
        return {
          method: 'contextual',
          summary: `Contextual understanding applied to "${context}".`,
          keyFindings: [
            'Tentative interpretation formed from user statements without presupposing direction.',
            `Active boundaries: ${this.state.boundaries.constraints.join(', ') || 'Standard bounds'}`,
          ],
          assumptionsIdentified: this.state.currentUnderstanding.assumptions.map((a) => a.assumption),
          tradeoffsOrRisks: [],
          smallestNextStep: 'Verify intent alignment with user before proposing structural solutions.',
        };

      case 'socratic':
        return {
          method: 'socratic',
          summary: `Socratic clarification applied to "${context}".`,
          keyFindings: [
            'Isolated the single most impactful uncertainty blocking deterministic progress.',
          ],
          assumptionsIdentified: ['User requirement scope has unresolved edge cases.'],
          tradeoffsOrRisks: ['Acting without clarification risks solving the wrong problem.'],
          smallestNextStep: this.state.decisionsAndOpenItems.openQuestions.find((q) => !q.answered)?.question ||
            'Formulate exactly one focused clarifying question.',
        };

      case 'analytical':
        return {
          method: 'analytical',
          summary: `Analytical decomposition applied to "${context}".`,
          keyFindings: [
            'Decomposed system into constituent components, dependencies, and invariants.',
            'Traced causal chain from inputs to observed behavior.',
          ],
          assumptionsIdentified: ['Underlying mechanisms operate deterministically under current constraints.'],
          tradeoffsOrRisks: ['Structural coupling between components may increase refactor cost.'],
          smallestNextStep: 'Validate component interfaces against the stated outcome.',
        };

      case 'creative':
        return {
          method: 'creative',
          summary: `Creative option generation applied to "${context}".`,
          keyFindings: [
            'Generated distinct, non-obvious alternative architectures.',
            'Explored orthogonal design paradigms before applying evaluation filters.',
          ],
          assumptionsIdentified: ['Existing constraints permit non-traditional workflow solutions.'],
          tradeoffsOrRisks: ['Novel solutions may incur higher initial implementation effort.'],
          smallestNextStep: 'Select top two viable divergent options for comparative evaluation.',
        };

      case 'critical':
      case 'inversion':
      case 'pre-mortem':
        return {
          method: methodOrLens,
          lens: methodOrLens === 'critical' ? undefined : (methodOrLens as SpecialistLens),
          summary: `Critical stress-test / ${methodOrLens} applied to "${context}".`,
          keyFindings: [
            'Identified key failure modes, bottleneck assumptions, and edge-case fragility.',
            'Tested system resilience against boundary condition violations.',
          ],
          assumptionsIdentified: ['Assumption of uncorrupted user inputs or synchronous state updates.'],
          tradeoffsOrRisks: [
            'Potential single point of failure under peak load or network disruption.',
            'Implicit reliance on unvalidated external dependencies.',
          ],
          smallestNextStep: 'Formulate targeted mitigations for the highest-severity failure mode.',
        };

      case 'systems':
      case 'second-order-effects':
        return {
          method: 'systems',
          lens: methodOrLens === 'second-order-effects' ? 'second-order-effects' : undefined,
          summary: `Systems thinking & feedback loop analysis applied to "${context}".`,
          keyFindings: [
            'Mapped interactions, feedback loops, incentives, and downstream dependencies.',
            'Traced second-order effects of proposed changes.',
          ],
          assumptionsIdentified: ['Downstream consumers can adapt to modified contract semantics.'],
          tradeoffsOrRisks: ['First-order optimizations might induce secondary friction in consumer modules.'],
          smallestNextStep: 'Verify dependency boundaries and cascade containment.',
        };

      case 'evidence-first':
      case 'evidence-vs-judgment':
        return {
          method: 'evidence-first',
          lens: methodOrLens === 'evidence-vs-judgment' ? 'evidence-vs-judgment' : undefined,
          summary: `Evidence-first investigation applied to "${context}".`,
          keyFindings: [
            `Separated verified facts (${this.state.currentUnderstanding.factsAndPriorities.length}) from inferences and judgments.`,
            `Documented ${this.state.currentUnderstanding.evidence.length} evidence references with source limits.`,
          ],
          assumptionsIdentified: this.state.currentUnderstanding.assumptions.map((a) => a.assumption),
          tradeoffsOrRisks: ['Inferences treated as facts will compromise downstream decision rigor.'],
          smallestNextStep: 'Gather empirical verification for low-confidence assumptions.',
        };

      case 'comparative':
      case 'decision-audit':
        return {
          method: 'comparative',
          lens: methodOrLens === 'decision-audit' ? 'decision-audit' : undefined,
          summary: `Comparative trade-off matrix & decision audit applied to "${context}".`,
          keyFindings: [
            'Evaluated candidate alternatives across explicit criteria and reversibility dimensions.',
            'Surfaced implicit value trade-offs and strongest counter-arguments.',
          ],
          assumptionsIdentified: ['Weighting criteria accurately reflect user priorities.'],
          tradeoffsOrRisks: ['Optimizing for speed vs long-term maintainability.'],
          smallestNextStep: 'Present side-by-side trade-off matrix for user selection.',
        };

      case 'procedural':
        return {
          method: 'procedural',
          summary: `Procedural step verification applied to "${context}".`,
          keyFindings: [
            'Structured execution into discrete, verifiable operations.',
            'Checked pre-conditions and scope boundaries prior to execution.',
          ],
          assumptionsIdentified: ['Target environment state matches expected prerequisites.'],
          tradeoffsOrRisks: ['Procedural drift if error handling is non-deterministic.'],
          smallestNextStep: 'Execute next authorized atomic step and verify output.',
        };

      default:
        return {
          method: methodOrLens,
          summary: `Specialist lens "${methodOrLens}" applied to "${context}".`,
          keyFindings: [`Applied focused lens: ${methodOrLens}`],
          assumptionsIdentified: [],
          tradeoffsOrRisks: [],
          smallestNextStep: 'Incorporate lens findings into active collaboration mode.',
        };
    }
  }

  /**
   * Returns recommended reasoning methods for a given collaboration mode.
   * @param mode Collaboration mode (defaults to currently active mode).
   */
  public getRecommendedMethodsForMode(mode?: CollaborationMode): readonly ReasoningMethod[] {
    const targetMode = mode || this.state.boundaries.activeMode;
    return MODE_RECOMMENDED_METHODS[targetMode] || ['contextual'];
  }

  /**
   * Returns the currently engaged reasoning method or specialist lens.
   */
  public getActiveReasoningMethod(): (ReasoningMethod | SpecialistLens) | null {
    return this.activeMethod;
  }

  /**
   * Sets or clears the active reasoning method.
   * Does not alter active mode or authority.
   * @param method Method, lens, or null to clear.
   */
  public setActiveReasoningMethod(method: (ReasoningMethod | SpecialistLens) | null): void {
    this.activeMethod = method;
  }

  /**
   * Performs an explicit Coherence Review against Goal, Constraints, Authority, Corrections, and Quality.
   * 
   * According to SHARED_STATE.md and FRAMEWORK_MENU.md:
   * - Checks whether the current output / plan matches original goals and constraints.
   * - Verifies that user corrections were respected and no unrequested scope expansion occurred.
   * - Returns the smallest necessary repair or one focused question.
   * 
   * @param proposedOutput Optional output text to validate against shared state.
   * @returns CoherenceReviewResult
   */
  public runCoherenceReview(proposedOutput?: string): CoherenceReviewResult {
    const mismatches: string[] = [];
    const text = proposedOutput || '';

    // Check goal alignment
    if (this.state.goal.outcome && this.state.goal.status === 'unknown') {
      mismatches.push('Working goal outcome has not been confirmed by user.');
    }

    // Check correction adherence
    for (const corr of this.state.currentUnderstanding.corrections) {
      if (text && text.toLowerCase().includes(corr.original.toLowerCase())) {
        mismatches.push(`Output contains superseded term/assumption: "${corr.original}". Must use: "${corr.corrected}".`);
      }
    }

    // Check constraint violations
    for (const constraint of this.state.boundaries.constraints) {
      if (text && text.toLowerCase().includes(`ignore ${constraint.toLowerCase()}`)) {
        mismatches.push(`Output may violate established constraint: "${constraint}".`);
      }
    }

    // Check authority boundaries
    if (this.state.boundaries.authority === 'discuss' && this.state.boundaries.activeMode === 'act') {
      mismatches.push('Authority is set to "discuss" but active mode is "act". Execution requires explicit authority.');
    }

    const isCoherent = mismatches.length === 0;

    return {
      isCoherent,
      mismatches,
      smallestRepair: isCoherent
        ? undefined
        : `Align output to respect: ${mismatches[0]}`,
      necessaryQuestion: isCoherent
        ? undefined
        : 'Would you like to confirm this adjustment before proceeding?',
    };
  }

  /**
   * Executes the 4-step UI/UX lens sequence for "clean and intuitive UI" requests.
   * (FRAMEWORK_MENU.md: Contextual -> User-Task -> UX Coherence -> Accessibility).
   * 
   * @param uiTaskDescription Description of the UI task or screen.
   */
  public applyUIXCoherenceFramework(uiTaskDescription: string): {
    provisionalGoal: string;
    steps: Array<{ step: number; framework: string; question: string }>;
  } {
    return {
      provisionalGoal: `Enable the primary user to accomplish "${uiTaskDescription}" with minimal friction, clear hierarchy, and accessible controls.`,
      steps: [
        {
          step: 1,
          framework: 'Contextual Understanding',
          question: 'Who is the user, what are they trying to do, and in what concrete situation?',
        },
        {
          step: 2,
          framework: 'User-Task Lens',
          question: 'What is the single main task this interface must make effortless?',
        },
        {
          step: 3,
          framework: 'UX Coherence Review',
          question: 'Can the user clearly see the next action, understand labels without help, and complete the core flow without distraction?',
        },
        {
          step: 4,
          framework: 'Critical / Accessibility Lens',
          question: 'What edge cases, error states, or accessibility barriers could confuse or exclude a real user?',
        },
      ],
    };
  }

  // ==========================================================================
  // 4) Approval Boundaries & External Action Safety
  // ==========================================================================

  /**
   * Determines whether an action is classified as durable, destructive, or external.
   * 
   * Rules from GLOBAL_CORE.md and SKILL.md:
   * - Durable writes, file modifications, publishing, sending messages, purchases, deployments,
   *   and system command execution are external/durable actions.
   * - Reading, inspecting, drafting, and local reasoning are read-only and safe.
   * 
   * @param actionType The action type identifier.
   */
  public isActionDurableOrExternal(actionType: string): boolean {
    return EXTERNAL_ACTION_TYPES.has(actionType.toLowerCase());
  }

  /**
   * Checks whether a proposed action crosses safety/authority boundaries and requires explicit user approval.
   * 
   * Safety Principles:
   * - Drafting and review are read-only.
   * - Research informs Decide; it does not execute.
   * - External actions (durable writes, deletions, purchases, deployments, sending data)
   *   require BOTH 'execute' authority AND explicit user approval.
   * 
   * @param action Description of the proposed action.
   * @returns ApprovalCheckResult detailing permission, requirements, risk, and approval token.
   */
  public checkApprovalBoundary(action: ExternalActionRequest): ApprovalCheckResult {
    const isExternal =
      action.isDurableOrExternal !== undefined
        ? action.isDurableOrExternal
        : this.isActionDurableOrExternal(action.actionType);

    const currentAuthority = this.state.boundaries.authority;
    const requiredAuthority: AuthorityLevel = isExternal ? 'execute' : 'discuss';
    const riskLevel: RiskLevel = action.riskLevel || (isExternal ? 'high' : 'none');

    // Read-only actions within discuss/recommend/select authority
    if (!isExternal) {
      return {
        isAllowed: true,
        requiresApproval: false,
        approvalGranted: true,
        currentAuthority,
        requiredAuthority,
        riskLevel: 'none',
        reason: 'Action is read-only / analytical and within standard authority.',
      };
    }

    // External action requires 'execute' authority
    if (currentAuthority !== 'execute') {
      return {
        isAllowed: false,
        requiresApproval: true,
        approvalGranted: false,
        currentAuthority,
        requiredAuthority: 'execute',
        riskLevel,
        reason: `External action "${action.actionType}" on "${action.target}" requires "execute" authority (current: "${currentAuthority}").`,
      };
    }

    // Check if an existing approval token has been granted in the registry
    const existing = Array.from(this.approvalRegistry.values()).find(
      (rec) => rec.action.target === action.target && rec.action.actionType === action.actionType && rec.status === 'granted'
    );

    if (existing) {
      return {
        isAllowed: true,
        requiresApproval: true,
        approvalGranted: true,
        currentAuthority,
        requiredAuthority,
        riskLevel,
        approvalToken: existing.token,
        reason: `Explicit approval previously granted (Token: ${existing.token}).`,
      };
    }

    // External action with execute authority, but pending explicit user confirmation
    return {
      isAllowed: false,
      requiresApproval: true,
      approvalGranted: false,
      currentAuthority,
      requiredAuthority,
      riskLevel,
      reason: `External/durable action "${action.actionType}" requires explicit user approval before proceeding.`,
    };
  }

  /**
   * Generates a pending ApprovalRecord token for an external action.
   * @param action The proposed external action.
   * @returns Created ApprovalRecord in 'pending' status.
   */
  public requestApproval(action: ExternalActionRequest): ApprovalRecord {
    const token = `appr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: ApprovalRecord = {
      token,
      action: {
        ...action,
        isDurableOrExternal: action.isDurableOrExternal ?? this.isActionDurableOrExternal(action.actionType),
        riskLevel: action.riskLevel || 'medium',
      },
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    this.approvalRegistry.set(token, record);
    return record;
  }

  /**
   * Grants explicit user approval for a pending approval token.
   * @param token Approval token generated by requestApproval.
   * @returns True if token was found and marked granted.
   */
  public grantApproval(token: string): boolean {
    const record = this.approvalRegistry.get(token);
    if (record && record.status === 'pending') {
      record.status = 'granted';
      record.grantedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Revokes or rejects an approval token.
   * @param token Approval token.
   * @returns True if revoked.
   */
  public revokeApproval(token: string): boolean {
    const record = this.approvalRegistry.get(token);
    if (record) {
      record.status = 'rejected';
      return true;
    }
    return false;
  }

  /**
   * Helper to determine default authority level associated with a mode.
   * @param mode Target collaboration mode.
   */
  private getDefaultAuthorityForMode(mode: CollaborationMode): AuthorityLevel {
    switch (mode) {
      case 'act':
        return 'execute';
      case 'decide':
        return 'recommend';
      case 'listen':
      case 'clarify':
      case 'exchange':
      case 'brainstorm':
      case 'challenge':
      case 'research':
      case 'plan':
      default:
        return 'discuss';
    }
  }
}
