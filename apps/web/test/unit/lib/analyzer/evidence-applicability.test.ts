import { describe, it, expect } from "vitest";
import { bindEvidenceSource, resolveBoundSource, mergeExtractionSources } from "@/lib/analyzer/evidence-source-binding";
import { planApplicability, prepareApplicabilityOperation, settleApplicabilityPart,
  isDirectForClaim, isForeignForAllClaims, ApplicabilityAssessmentOutputSchema } from "@/lib/analyzer/evidence-applicability";
import { reconcileEvidenceSourceIds } from "@/lib/analyzer/research-acquisition-stage";
import type { AtomicClaim, EvidenceItem, FetchedSource } from "@/lib/analyzer/types";

const claims = [{ id: "A", statement: "Plastik recycling bringt nichts" }, { id: "B", statement: "Le recyclage du plastique ne sert à rien" }] as AtomicClaim[];
const source = (text = "ä ação 東京 😀", id = "S1", url = "https://example.test/a") => ({ id, url, title: id, fullText: text }) as FetchedSource;
const item = (s = source(), id = "E1", links = ["A", "B"]) => ({ id, statement: "x".repeat(400), sourceId: s.id,
  sourceUrl: s.url, relevantClaimIds: links, claimDirection: "supports", sourceBinding: bindEvidenceSource(s.url,[{ url:s.url,text:s.fullText }]),
}) as EvidenceItem;
const limits = { sourceBytes:65536, requestBytes:131072, maxRequests:4, totalRequestBytes:524288, outputTokens:8192, reservationUSD:1 };
const serialize = async (p: any) => ({ bodySha256:"a".repeat(64), requestBytes:100+p.sources.reduce((n:number,s:any)=>n+s.utf8Length,0), model:"model",provider:"provider" });
const observation = (rows:any[]) => ({ invoked:true,outcome:"success" as const,finishReason:"tool-calls",response:{assessments:rows} });

describe("exact source binding", () => {
  it.each([undefined,"", "https://unknown.test/"])("never promotes missing/foreign URL %s", url => {
    expect(bindEvidenceSource(url,[{url:source().url,text:source().fullText}]).status).toBe("unresolved");
  });
  it("deduplicates identical views and retains different versions of one URL", () => {
    const sources:FetchedSource[]=[];
    mergeExtractionSources(sources,[source(),source(),source("other","S2")]);
    expect(sources).toHaveLength(2);
    expect(resolveBoundSource(item(source("other")).sourceBinding,sources)?.source.id).toBe("S_002");
    expect(bindEvidenceSource(source().url,sources.map(s=>({url:s.url,text:s.fullText})))).toMatchObject({status:"unresolved",reason:"ambiguous_source_view"});
  });
  it("reconciliation cannot upgrade an unresolved binding or select a wrong version", () => {
    const e=item();e.sourceId="";e.sourceBinding={status:"unresolved",reason:"missing_returned_url"};
    reconcileEvidenceSourceIds([e],[source()]);expect(e.sourceId).toBe("");
    expect(e.sourceBinding).toEqual({status:"unresolved",reason:"missing_returned_url"});
    const correct=source("version2","S2"),bound=item(correct);bound.sourceId="";
    reconcileEvidenceSourceIds([bound],[source(),correct]);expect(bound.sourceId).toBe("S2");
  });
  it("validates Unicode, retained bytes and bounds without normalization", () => {
    const s=source(), binding=item(s).sourceBinding!;
    expect(resolveBoundSource(binding,[s])?.text).toBe(s.fullText);
    expect(resolveBoundSource(binding,[source(s.fullText+" suffix")])?.text).toBe(s.fullText);
    expect(resolveBoundSource(binding,[source("changed")])).toBeUndefined();
    if(binding.status!=="bound") throw Error("fixture");
    expect(binding.view.utf8Length).toBe(Buffer.byteLength(s.fullText));
    for(const patch of [{start:-1},{end:999},{sha256:"bad"},{utf8Length:1},{ref:"bad"}])
      expect(resolveBoundSource({...binding,view:{...binding.view,...patch}},[s])).toBeUndefined();
    expect(bindEvidenceSource(s.url,[{url:s.url,text:"\ud800"}]).status).toBe("unresolved");
    expect(JSON.stringify(binding)).not.toContain(s.fullText);
  });
});

describe("source-cohesive operation and admission", () => {
  it("preserves complete statements and only explicit final-claim links", () => {
    const e=item();e.relevantClaimIds=["A","A","unknown"];
    const p=planApplicability(claims,[e], [source()]);
    expect(p.rows).toHaveLength(1);expect(p.items[0].statement.length).toBe(400);
    expect(p.issues).toContainEqual({evidenceId:"E1",reason:"unknown_claim_link"});
    expect(p.items[0].applicabilityByClaim).not.toHaveProperty("unknown");
    expect(planApplicability(claims,[item(source(),"E2",[])],[source()]).rows).toEqual([]);
  });
  it("never grants source authority from a display URL or source ID", () => {
    const e=item();delete e.sourceBinding;e.applicability="direct";
    const p=planApplicability(claims,[e],[source()]);
    expect(p.rows).toEqual([]);expect(isDirectForClaim(p.items[0],"A")).toBe(false);
    expect(p.items[0].applicabilityByClaim?.A).toMatchObject({reason:"missing_binding",assessed:false});
  });
  it("packs stable source groups and rejects whole-operation count/bytes before any send", async () => {
    const sources=[source("x".repeat(10),"S1","https://a.test"),source("y".repeat(10),"S2","https://b.test")];
    const p=planApplicability(claims,sources.map((s,i)=>item(s,`E${i}`)),sources);
    const op=await prepareApplicabilityOperation(p,{...limits,sourceBytes:10,maxRequests:1,totalRequestBytes:200},serialize);
    expect(op.parts.map(p=>p.plan.rows.length)).toEqual([2,2]);
    expect(op.admission).toMatchObject({admitted:false,actualInvocations:0,reservationUSD:null,maxPhysicalAttempts:6});
    expect(op.admission.reasons).toEqual(["token_rate_proof_unavailable","request_count","operation_bytes"]);
    expect(new Set(op.parts.flatMap(p=>p.plan.rows.map(r=>r.rowId))).size).toBe(4);
  });
  it("does not split or clip an oversized source group", async () => {
    const p=planApplicability(claims,[item()],[source()]);
    const op=await prepareApplicabilityOperation(p,{...limits,sourceBytes:1},serialize);
    expect(op.parts).toEqual([]);expect(op.oversized).toHaveLength(2);
    settleApplicabilityPart(p.items,op.oversized,{invoked:false,outcome:"unavailable",reason:"oversized_source_group"});
    expect(p.items[0].applicabilityByClaim?.A).toMatchObject({reason:"oversized_source_group",assessed:false});
  });
  it("has no UCM verified flag or caller proof bypass", async () => {
    const p=planApplicability(claims,[item()],[source()]);
    const op=await prepareApplicabilityOperation(p,{...limits,verified:true} as any,serialize);
    expect(op.admission.admitted).toBe(false);
  });
});

describe("partition settlement and per-claim consumers", () => {
  it("keeps independent decisions for two claims and removes only all-foreign items", () => {
    const p=planApplicability(claims,[item()],[source()]);
    expect(settleApplicabilityPart(p.items,p.rows,observation(p.rows.map((r,i)=>({rowId:r.rowId,applicability:i?"foreign_reaction":"direct"})))).continue).toBe(true);
    expect(isDirectForClaim(p.items[0],"A")).toBe(true);expect(isDirectForClaim(p.items[0],"B")).toBe(false);
    expect(isForeignForAllClaims(p.items[0],claims)).toBe(false);
    settleApplicabilityPart(p.items,p.rows,observation(p.rows.map(r=>({rowId:r.rowId,applicability:"foreign_reaction"}))));
    expect(isForeignForAllClaims(p.items[0],claims)).toBe(true);
    p.items[0].relevantClaimIds!.push("unknown");expect(isForeignForAllClaims(p.items[0],claims)).toBe(false);
  });
  it.each(["length","content-filter","error",undefined])("rejects the whole part on finish %s", finishReason => {
    const p=planApplicability(claims,[item()],[source()]);
    expect(settleApplicabilityPart(p.items,p.rows,{...observation(p.rows.map(r=>({rowId:r.rowId,applicability:"direct"}))),finishReason}).continue).toBe(false);
    expect(Object.values(p.items[0].applicabilityByClaim!).every(p=>p.status==="unresolved"&&p.assessed)).toBe(true);
  });
  it("raw refusal overrides normalized success; failed schema has no row salvage", () => {
    for(const patch of [{rawFinishReason:"refusal"},{response:{assessments:[{rowId:'["E1","A"]',applicability:"direct",extra:true}]}}]) {
      const p=planApplicability(claims,[item()],[source()]);
      settleApplicabilityPart(p.items,p.rows,{...observation([]),...patch});
      expect(isDirectForClaim(p.items[0],"A")).toBe(false);
    }
  });
  it("keeps unique valid rows on missing/unknown rows, invalidates every duplicate, and stops", () => {
    for(const other of [undefined,{rowId:"unknown",applicability:"direct"},{rowId:'["E1","A"]',applicability:"contextual"}]) {
      const p=planApplicability(claims,[item()],[source()]);
      const rows=[{rowId:p.rows[0].rowId,applicability:"direct"},...(other?[other]:[])];
      expect(settleApplicabilityPart(p.items,p.rows,observation(rows)).continue).toBe(false);
      expect(isDirectForClaim(p.items[0],"A")).toBe(other?.rowId!==p.rows[0].rowId);
      expect(isDirectForClaim(p.items[0],"B")).toBe(false);
    }
  });
  it("valid unresolved continues; a later failed partition cannot erase earlier decisions", () => {
    const p=planApplicability(claims,[item()],[source()]);
    expect(settleApplicabilityPart(p.items,[p.rows[0]],observation([{rowId:p.rows[0].rowId,applicability:"unresolved"}])).continue).toBe(true);
    settleApplicabilityPart(p.items,[p.rows[0]],observation([{rowId:p.rows[0].rowId,applicability:"direct"}]));
    settleApplicabilityPart(p.items,[p.rows[1]],{invoked:true,outcome:"failure"});
    expect(isDirectForClaim(p.items[0],"A")).toBe(true);expect(isDirectForClaim(p.items[0],"B")).toBe(false);
  });
  it("allows legacy reads but never new missing-map directness", () => {
    expect(isDirectForClaim({} as any,"A")).toBe(true);
    expect(isDirectForClaim({} as any,"A",true)).toBe(false);
    expect(isDirectForClaim({applicability:"direct",applicabilityByClaim:{}} as any,"A")).toBe(false);
    expect(isDirectForClaim({applicabilityByClaim:{}} as any,"__proto__")).toBe(false);
    expect(ApplicabilityAssessmentOutputSchema.safeParse({assessments:[{evidenceIndex:0,applicability:"direct"}]}).success).toBe(false);
  });
});
