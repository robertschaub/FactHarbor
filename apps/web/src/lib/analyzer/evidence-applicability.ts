import { z } from "zod";
import { resolveBoundSource } from "./evidence-source-binding";
import type { AtomicClaim, ClaimApplicability, EvidenceItem, FetchedSource } from "./types";

export const ApplicabilityAssessmentOutputSchema = z.object({
  assessments: z.array(z.object({
    rowId: z.string().min(1),
    applicability: z.enum(["direct", "contextual", "foreign_reaction", "unresolved"]),
  }).strict()),
}).strict();

export type ApplicabilityRow = { rowId: string; evidenceId: string; claimId: string; sourceRef: string };
export type ApplicabilityView = NonNullable<ReturnType<typeof resolveBoundSource>>["view"] & {
  text: string; aliases: Array<{ sourceId: string; title: string }>;
};
export interface ApplicabilityPlan {
  items: EvidenceItem[];
  claims: Pick<AtomicClaim, "id" | "statement">[];
  rows: ApplicabilityRow[];
  sources: ApplicabilityView[];
  issues: Array<{ evidenceId: string; reason: string }>;
}
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const unresolved = (reason: string, assessed = false): ClaimApplicability => ({ status: "unresolved", reason, assessed });
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

/** Establish contract mode before any early return. Never copy historical scalar authority. */
export function initializeClaimApplicability(items: EvidenceItem[], claims: Pick<AtomicClaim, "id">[]): EvidenceItem[] {
  const ids = new Set(claims.map(c => c.id));
  return items.map(item => ({ ...item, applicability: undefined, applicabilityAssessed: false,
    applicabilityByClaim: Object.fromEntries([...new Set(item.relevantClaimIds ?? [])]
      .filter(id => ids.has(id)).map(id => [id, unresolved("unattempted")])) }));
}

export function planApplicability(claims: AtomicClaim[], evidence: EvidenceItem[], sources: FetchedSource[]): ApplicabilityPlan {
  const items = initializeClaimApplicability(evidence, claims), rows: ApplicabilityRow[] = [],
    views = new Map<string, ApplicabilityView>(), issues: ApplicabilityPlan["issues"] = [];
  const uniqueIds = (records: { id: string }[]) => records.every(r => typeof r.id === "string" && r.id.length > 0)
    && new Set(records.map(r => r.id)).size === records.length;
  if (!uniqueIds(claims) || !uniqueIds(items)) throw new Error("Invalid applicability IDs");
  const finalIds = new Set(claims.map(c => c.id));
  for (const item of items) {
    const links = [...new Set(item.relevantClaimIds ?? [])];
    if (!links.length) issues.push({ evidenceId: item.id, reason: "missing_claim_links" });
    if (links.some(id => !finalIds.has(id))) issues.push({ evidenceId: item.id, reason: "unknown_claim_link" });
    const bound = resolveBoundSource(item.sourceBinding, sources);
    const reason = item.sourceBinding?.status === "unresolved" ? item.sourceBinding.reason
      : item.sourceBinding ? "invalid_source_view" : "missing_binding";
    for (const claimId of links.filter(id => finalIds.has(id))) {
      if (!bound) { item.applicabilityByClaim![claimId] = unresolved(reason); continue; }
      rows.push({ rowId: JSON.stringify([item.id, claimId]), evidenceId: item.id, claimId, sourceRef: bound.view.ref });
    }
    if (bound && links.some(id => finalIds.has(id))) {
      const aliases = sources.filter(s => resolveBoundSource(item.sourceBinding, [s])).map(s => ({ sourceId: s.id, title: s.title }));
      views.set(bound.view.ref, { ...bound.view, text: bound.text, aliases });
    }
  }
  return { items, claims: claims.map(({ id, statement }) => ({ id, statement })),
    rows: rows.sort((a,b) => order(a.rowId,b.rowId)), sources: [...views.values()].sort((a,b) => order(a.ref,b.ref)), issues };
}

export function applicabilitySubset(plan: ApplicabilityPlan, refs: string[]): ApplicabilityPlan {
  const selected = new Set(refs), rows = plan.rows.filter(r => selected.has(r.sourceRef));
  const ids = new Set(rows.map(r => r.evidenceId));
  return { ...plan, rows, sources: plan.sources.filter(s => selected.has(s.ref)),
    items: plan.items.filter(i => ids.has(i.id)).sort((a,b) => order(a.id,b.id)) };
}

export function applicabilityPayload(plan: ApplicabilityPlan, geography: unknown): object {
  return { claims: plan.claims, sources: plan.sources,
    evidenceItems: plan.items.map(({ id, statement, evidenceScope, relevantClaimIds, category, sourceType }) =>
      ({ id, statement, evidenceScope, relevantClaimIds, category, sourceType })),
    rows: plan.rows, contextOnlyEvidenceIds: [], geography };
}

export interface PreparedApplicabilityRequest { bodySha256: string; requestBytes: number; model: string; provider: string }
export interface ApplicabilityLimits {
  sourceBytes: number; requestBytes: number; maxRequests: number; totalRequestBytes: number;
  outputTokens: number; reservationUSD: number;
}

/** Packing measures complete SDK bodies. No clipping, estimate or affordable prefix. */
export async function prepareApplicabilityOperation(plan: ApplicabilityPlan, limits: ApplicabilityLimits,
  serialize: (part: ApplicabilityPlan) => Promise<PreparedApplicabilityRequest>) {
  if (![limits.sourceBytes, limits.requestBytes, limits.maxRequests, limits.totalRequestBytes, limits.outputTokens]
    .every(n => Number.isSafeInteger(n) && n > 0) || !Number.isFinite(limits.reservationUSD) || limits.reservationUSD <= 0) {
    throw new Error("Invalid applicability limits");
  }
  const parts: Array<{ plan: ApplicabilityPlan; request: PreparedApplicabilityRequest }> = [];
  const oversized: ApplicabilityRow[] = [];
  const cache = new Map<string, PreparedApplicabilityRequest>();
  const measure = async (part: ApplicabilityPlan) => {
    const key = JSON.stringify(part.sources.map(s => s.ref));
    if (!cache.has(key)) {
      const request = await serialize(part);
      if (!Number.isSafeInteger(request.requestBytes) || request.requestBytes <= 0 ||
        !/^[a-f0-9]{64}$/.test(request.bodySha256) || !request.model || !request.provider) throw new Error("Invalid prepared request");
      cache.set(key, request);
    }
    return cache.get(key)!;
  };
  const fits = async (part: ApplicabilityPlan) => part.sources.reduce((n,s) => n+s.utf8Length,0) <= limits.sourceBytes
    && (await measure(part)).requestBytes <= limits.requestBytes;
  let current: string[] = [];
  const append = async () => { const part = applicabilitySubset(plan, current); parts.push({ plan: part, request: await measure(part) }); };
  for (const source of plan.sources) {
    const single = applicabilitySubset(plan, [source.ref]);
    if (!await fits(single)) { oversized.push(...single.rows); continue; }
    if (current.length && !await fits(applicabilitySubset(plan, [...current, source.ref]))) { await append(); current = []; }
    current.push(source.ref);
  }
  if (current.length) await append();
  const totalRequestBytes = parts.reduce((n,p) => n+p.request.requestBytes,0);
  const reasons = ["token_rate_proof_unavailable"];
  if (parts.length > limits.maxRequests) reasons.push("request_count");
  if (!Number.isSafeInteger(totalRequestBytes) || totalRequestBytes > limits.totalRequestBytes) reasons.push("operation_bytes");
  // There is deliberately no UCM/request 'verified' switch or unqualified proof input.
  // Qualification of an internal token/rate proof producer and physical-send guard is
  // required before this stage can execute. Preparation never constructs a live transport.
  return { parts, oversized, admission: { admitted: false as const, reasons, totalRequestBytes,
    reservationUSD: null, maxPhysicalAttempts: parts.length * 3,
    nominalOutputTokensExposure: parts.length * 3 * limits.outputTokens, actualInvocations: 0 } };
}

/** Strict partition settlement. Unique valid own rows survive structural row anomalies. */
export function settleApplicabilityPart(items: EvidenceItem[], rows: ApplicabilityRow[], observation: {
  invoked: boolean; outcome: "success" | "failure" | "unavailable";
  response?: unknown; finishReason?: string; rawFinishReason?: string; reason?: string;
}): { continue: boolean; unknownRows: number; reason?: string } {
  const schema = ApplicabilityAssessmentOutputSchema.extend({
    assessments: ApplicabilityAssessmentOutputSchema.shape.assessments.max(rows.length),
  });
  const parsed = schema.safeParse(observation.response);
  let failure = !observation.invoked ? observation.reason ?? "unattempted"
    : observation.outcome !== "success" ? "call_failed"
    : !["stop", "tool-calls"].includes(observation.finishReason ?? "") || observation.rawFinishReason === "refusal" ? "finish_reason"
    : !parsed.success ? "schema_failed" : undefined;
  const expected = new Set(rows.map(r => r.rowId)), groups = new Map<string, Array<{ applicability: string }>>();
  let unknownRows = 0;
  if (!failure && parsed.success) for (const row of parsed.data.assessments) {
    if (!expected.has(row.rowId)) { unknownRows++; continue; }
    groups.set(row.rowId, [...(groups.get(row.rowId) ?? []), row]);
  }
  let anomaly = unknownRows > 0;
  for (const row of rows) {
    const item = items.find(i => i.id === row.evidenceId);
    if (!item?.applicabilityByClaim || !own(item.applicabilityByClaim,row.claimId)) throw new Error("Settlement identity mismatch");
    const matches = groups.get(row.rowId) ?? [];
    const reason = failure ?? (matches.length !== 1 ? matches.length ? "duplicate_row" : "missing_row" : undefined);
    if (!failure && reason) anomaly = true;
    const classification = matches[0]?.applicability;
    item.applicabilityByClaim[row.claimId] = reason ? unresolved(reason, observation.invoked)
      : classification === "unresolved" ? unresolved("llm_unresolved", true)
      : { status: "assessed", assessed: true, classification: classification as "direct" | "contextual" | "foreign_reaction" };
    item.applicabilityAssessed = item.applicabilityAssessed || observation.invoked;
  }
  return { continue: !failure && !anomaly, unknownRows, reason: failure ?? (anomaly ? "row_anomaly" : undefined) };
}

type ApplicabilityItem = Pick<EvidenceItem, "applicability" | "applicabilityAssessed" | "applicabilityByClaim">;
export function isDirectForClaim(item: ApplicabilityItem | undefined, claimId: string, requirePairs = false): boolean {
  if (!item) return false;
  if (item.applicabilityByClaim !== undefined || requirePairs) {
    const pair = item.applicabilityByClaim && own(item.applicabilityByClaim,claimId) ? item.applicabilityByClaim[claimId] : undefined;
    return pair?.assessed === true && pair.status === "assessed" && pair.classification === "direct";
  }
  // Read compatibility for historical reports / explicitly filter-disabled consumers.
  return item.applicability === "direct" || (!item.applicability && item.applicabilityAssessed !== true);
}

export function isForeignForAllClaims(item: EvidenceItem, claims: Pick<AtomicClaim,"id">[]): boolean {
  const final = new Set(claims.map(c => c.id)), links = [...new Set(item.relevantClaimIds ?? [])];
  return links.length > 0 && links.every(id => final.has(id) && own(item.applicabilityByClaim ?? {},id) &&
    item.applicabilityByClaim![id].assessed && item.applicabilityByClaim![id].status === "assessed" &&
    (item.applicabilityByClaim![id] as { classification?: string }).classification === "foreign_reaction");
}
