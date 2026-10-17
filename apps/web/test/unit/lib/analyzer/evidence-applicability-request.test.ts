import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const captured = vi.hoisted(() => ({ bodies: [] as any[], options: [] as any[] }));
vi.mock("@ai-sdk/anthropic", async importOriginal => {
  const actual = await importOriginal<typeof import("@ai-sdk/anthropic")>();
  return { ...actual, createAnthropic: (options:any) => {
    captured.options.push(options);
    return actual.createAnthropic({...options, fetch: async (url:any,init:any) => {
      captured.bodies.push(JSON.parse(init.body));return options.fetch(url,init);
    }});
  }};
});
vi.mock("@/lib/config-loader", () => ({loadPromptConfig: vi.fn()}));
vi.mock("@/lib/analyzer/prompt-loader", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/analyzer/prompt-loader")>(), loadAndRenderSection: vi.fn() }));
vi.mock("@/lib/analyzer/metrics-integration", () => ({recordLLMCall:vi.fn()}));
import { loadPromptConfig } from "@/lib/config-loader";
import { loadAndRenderSection } from "@/lib/analyzer/prompt-loader";
import { assessEvidenceApplicability, serializeApplicabilityRequest } from "@/lib/analyzer/research-extraction-stage";
import { planApplicability } from "@/lib/analyzer/evidence-applicability";
import { bindEvidenceSource } from "@/lib/analyzer/evidence-source-binding";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/config-schemas";
import { recordLLMCall } from "@/lib/analyzer/metrics-integration";
const source = {id:"S1",url:"https://example.test/",title:"S",fullText:"ä ação 東京 😀"} as any;
const claims = [{id:"A",statement:"Plastik recycling bringt nichts"}] as any;
const evidence = [{id:"E1",statement:"x".repeat(1000),sourceUrl:source.url,relevantClaimIds:["A"],
  sourceBinding:bindEvidenceSource(source.url,[{url:source.url,text:source.fullText}])}] as any;
const config = {...DEFAULT_PIPELINE_CONFIG,llmTiering:true,modelUnderstand:"budget"};
const nativeFetch=vi.fn(()=>{throw Error("Native send forbidden");});
beforeEach(async ()=>{
  vi.clearAllMocks();captured.bodies=[];captured.options=[];vi.stubGlobal("fetch",nativeFetch);
  const prompt=readFileSync(resolve("prompts/claimboundary.prompt.md"),"utf8");
  const hash=createHash("sha256").update(prompt).digest("hex");
  const actual=await vi.importActual<typeof import("@/lib/analyzer/prompt-loader")>("@/lib/analyzer/prompt-loader");
  actual.clearPromptCache();
  vi.mocked(loadPromptConfig).mockResolvedValue({content:prompt,contentHash:hash,fromCache:false,seededFromFile:false} as any);
  vi.mocked(loadAndRenderSection).mockImplementation(actual.loadAndRenderSection);
});
afterEach(()=>vi.unstubAllGlobals());
describe("real SDK offline applicability preparation",()=>{
  it.each([true,false])("keeps routing/policy and denies sends with tiering=%s",async llmTiering=>{
    const plan=planApplicability(claims,evidence,[source]);
    const request=await serializeApplicabilityRequest(plan,{inferredGeography:null,relevantGeographies:[]},{...config,llmTiering});
    expect(captured.options[0].apiKey).toBe("offline-placeholder-not-a-credential");
    expect(captured.bodies).toHaveLength(1);expect(nativeFetch).not.toHaveBeenCalled();
    const body=captured.bodies[0];
    expect(body.model).toBe(request.model);expect(body.max_tokens).toBe(8192);
    expect(body.tool_choice.type).toBe("any");expect(body.tools).toHaveLength(1);
    expect(body.tools[0].input_schema.properties.assessments.maxItems).toBe(1);
    expect(JSON.stringify(body)).toContain(evidence[0].statement);
    expect(JSON.stringify(body)).toContain(source.fullText);
    expect(request.requestBytes).toBe(Buffer.byteLength(JSON.stringify(body)));
    expect(request.bodySha256).toBe(createHash("sha256").update(JSON.stringify(body)).digest("hex"));
    expect(body.model).toContain(llmTiering?"haiku":"sonnet");
    expect(recordLLMCall).not.toHaveBeenCalled();
  });
  it("blocks every pair with no token/rate proof, including non-geographic inputs",async()=>{
    const warnings:any[]=[];
    const result=await assessEvidenceApplicability(claims,evidence,null,config,[],warnings,undefined,[source]);
    expect(result[0].applicabilityByClaim.A).toEqual({status:"unresolved",assessed:false,reason:"token_rate_proof_unavailable"});
    expect(warnings[0].details.admission).toMatchObject({admitted:false,actualInvocations:0,reservationUSD:null});
    expect(warnings[0].details.parts).toHaveLength(1);expect(nativeFetch).not.toHaveBeenCalled();
    expect(JSON.stringify(warnings)).not.toContain(source.fullText);
    expect(recordLLMCall).not.toHaveBeenCalled();
  });
  it("missing prompt or changed pin cannot fall back to direct or a real transport",async()=>{
    vi.mocked(loadAndRenderSection).mockResolvedValue(null as any);
    const result=await assessEvidenceApplicability(claims,evidence,"CH",config,[],[],undefined,[source]);
    expect(result[0].applicabilityByClaim.A.reason).toBe("preparation_failed");
    expect(captured.options).toHaveLength(0);expect(nativeFetch).not.toHaveBeenCalled();
  });
  it("disabled mode neither prepares nor claims the new guarantee",async()=>{
    expect(await assessEvidenceApplicability(claims,evidence,null,{...config,applicabilityFilterEnabled:false},[],[],undefined,[source])).toBe(evidence);
    expect(captured.options).toHaveLength(0);expect(nativeFetch).not.toHaveBeenCalled();
  });
});
