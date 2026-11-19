export type Trust =
  | "USER_AUTHORIZED"
  | "SYSTEM_POLICY"
  | "EXTERNAL_UNTRUSTED"
  | "MODEL_DERIVED"
  | "VERIFIED_FACT";
export type Verdict = "ALLOW" | "QUARANTINE" | "REJECT" | "REVIEW";
export interface ContentInput {
  content: string;
  source?: string;
  taskId?: string;
  parentIds?: string[];
}
export interface MemoryInput {
  text: string;
  parentIds: string[];
  taskId?: string;
}
export interface Opinion {
  role: "primary" | "second-opinion";
  intent?: string;
  providerId?: string;
  verdict?: Verdict;
  label?: string;
  confidence: number | null;
  uncertain: boolean | null;
  reasons?: string[];
  receiptHash?: string;
  signalHash?: string;
  costUusdc?: string;
  latencyMs?: number;
  cached: boolean;
  error?: string;
}
export interface Assessment {
  verdict: Verdict;
  uncertain?: boolean;
  label?: string;
  rule?: string;
  conflict?: boolean;
  opinions?: Opinion[];
  paidRequests?: number;
  reasons?: string[];
  confidence: number | null;
  providerId?: string;
  intent?: string;
  receiptHash?: string;
  signalHash?: string;
  txHash?: string;
  network?: string;
  costUusdc?: string;
  latencyMs?: number;
  schemaVersion?: string;
}
export interface Action {
  operation: "transfer";
  resource: string;
  destination: string;
  amount: string;
}
export interface ConsentInput {
  operation: "transfer";
  resource: string;
  destination: string;
  maxAmount: string;
  expiresAt: number;
  userId?: string;
  /** Set only after the user has seen a flagged paid risk check. */
  riskAccepted?: boolean;
}
export interface EngineOptions {
  path?: string;
  secret: string;
  review?: (input: {
    content: string;
    task: string;
    purpose: string;
    sources?: string[];
  }) => Promise<Assessment>;
  clock?: () => number;
  actionReview?: (input: {
    action: Action;
    task: string;
    sources?: string[];
  }) => Promise<Assessment>;
  /** Atomic units at or above which a memory-free action is risk checked. */
  actionReviewMinAmount?: string;
  /** createAimo only: wire Telegraph reviewers from the environment. */
  telegraph?: boolean;
}
export interface StoredRecord {
  id: string;
  verdict: Verdict;
  kind: "content" | "memory";
  trust: Trust;
  sourceIds: string[];
  assessment: Assessment | null;
  pendingUserReview: boolean;
  memo: string;
}
export interface RecoveryResult {
  affected: string[];
  schedules: string[];
  snapshotId?: string;
  memo: string;
  kept: string[];
  receipts: string[];
  rederive: { id: string; cleanParents: string[] }[];
}
export declare class IntegrityEngine {
  constructor(path: string, options: EngineOptions);
  inspectRetrieved(input: ContentInput): Promise<StoredRecord>;
  proposeMemory(input: MemoryInput): Promise<StoredRecord>;
  reviewQueue(): StoredRecord[];
  resolveReview(input: {
    id: string;
    decision: "approve" | "reject";
    operator?: string;
  }): { id: string; status: string };
  rederive(input: {
    id: string;
    text: string;
    taskId?: string;
  }): Promise<StoredRecord>;
  authorizeAction(input: {
    tool: (action: Action, key: string) => Promise<unknown>;
    args: Action;
    memoryIds?: string[];
    consentId?: string;
    idempotencyKey: string;
    userRequest?: string;
  }): Promise<unknown>;
  issueConsent(
    input: ConsentInput,
  ): ConsentInput & { consentId: string; signature: string };
  execute(
    input: {
      action: Action;
      consentId?: string;
      memoryIds?: string[];
      idempotencyKey: string;
      userRequest?: string;
    },
    tool: (action: Action, key: string) => Promise<unknown>,
  ): Promise<unknown>;
  quarantineAndRecover(input: {
    compromisedId: string;
    dryRun?: boolean;
    operator?: string;
  }): RecoveryResult;
  chainHead(): { seq: number; hash: string } | undefined;
  undoRecovery(snapshotId: string): { restored: string[] };
  verify(): boolean;
}
export declare function createAimo(options: EngineOptions): IntegrityEngine;
