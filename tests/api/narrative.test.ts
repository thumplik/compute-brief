import { describe, expect, it, beforeEach, vi } from "vitest";

const { runNarrativeGeneration } = vi.hoisted(() => ({ runNarrativeGeneration: vi.fn() }));

vi.mock("@/lib/ai/conversation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/conversation")>("@/lib/ai/conversation");
  return { ...actual, runNarrativeGeneration };
});

import { POST } from "@/app/api/narrative/route";
import { NarrativeGenerationError } from "@/lib/ai/conversation";
import { ragDocumentQaSpec } from "../fixtures/workload-specs";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/narrative", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/narrative", () => {
  beforeEach(() => {
    runNarrativeGeneration.mockReset();
  });

  it("computes a ComputePlan from the spec and returns it with the narrative", async () => {
    runNarrativeGeneration.mockResolvedValue("# Workload Brief\n\nBody.");

    const response = await POST(postRequest({ spec: ragDocumentQaSpec() }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.narrative).toBe("# Workload Brief\n\nBody.");
    expect(json.plan.trainingVsInference.value).toBe("inference_only");
  });

  it("rejects a request with no spec", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid JSON body", async () => {
    const request = new Request("http://localhost/api/narrative", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 502 with a readable message when narrative generation fails", async () => {
    runNarrativeGeneration.mockRejectedValue(new NarrativeGenerationError());

    const response = await POST(postRequest({ spec: ragDocumentQaSpec() }));

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toMatch(/try again/i);
  });
});
