import { describe, expect, it, vi } from "vitest";
import {
  runConversationTurn,
  runNarrativeGeneration,
  TurnGenerationError,
  NarrativeGenerationError,
} from "@/lib/ai/conversation";
import { emptyWorkloadSpec } from "@/lib/schema/workload-spec";
import { userProvided } from "@/lib/schema/provenance";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { ragDocumentQaSpec } from "../fixtures/workload-specs";

const fixtureTurnResult = {
  assistantMessage: "Got it — that sounds like a retrieval problem over your documents.",
  specPatch: { classification: userProvided(["rag"]) },
  nextQuestion: "Roughly how many documents are we talking about?",
  readiness: "needs_information" as const,
};

describe("runConversationTurn", () => {
  it("passes the model, schema, instructions with current spec, and mapped messages", async () => {
    const generateObjectFn = vi.fn().mockResolvedValue({ object: fixtureTurnResult });
    const spec = { ...emptyWorkloadSpec(), requester: { organization: userProvided("Acme Robotics") } };

    const result = await runConversationTurn({
      history: [{ role: "user", content: "We want to search our internal docs." }],
      spec,
      generateObjectFn,
    });

    expect(result).toEqual(fixtureTurnResult);
    expect(generateObjectFn).toHaveBeenCalledTimes(1);
    const callArgs = generateObjectFn.mock.calls[0][0];
    expect(callArgs.messages).toEqual([
      { role: "user", content: "We want to search our internal docs." },
    ]);
    expect(callArgs.instructions).toContain("Acme Robotics");
    expect(callArgs.schema).toBeDefined();
    expect(callArgs.model).toBeDefined();
  });

  it("retries once on failure and succeeds if the retry works", async () => {
    const generateObjectFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("invalid JSON"))
      .mockResolvedValueOnce({ object: fixtureTurnResult });

    const result = await runConversationTurn({
      history: [],
      spec: emptyWorkloadSpec(),
      generateObjectFn,
    });

    expect(result).toEqual(fixtureTurnResult);
    expect(generateObjectFn).toHaveBeenCalledTimes(2);
  });

  it("throws a readable TurnGenerationError after two failures", async () => {
    const generateObjectFn = vi.fn().mockRejectedValue(new Error("invalid JSON"));

    await expect(
      runConversationTurn({ history: [], spec: emptyWorkloadSpec(), generateObjectFn })
    ).rejects.toThrow(TurnGenerationError);
    expect(generateObjectFn).toHaveBeenCalledTimes(2);
  });
});

describe("runNarrativeGeneration", () => {
  it("passes spec and plan JSON to the model and returns the generated text", async () => {
    const spec = ragDocumentQaSpec();
    const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);
    const generateTextFn = vi.fn().mockResolvedValue({ text: "# Workload Brief\n\n..." });

    const narrative = await runNarrativeGeneration({ spec, plan, generateTextFn });

    expect(narrative).toBe("# Workload Brief\n\n...");
    const callArgs = generateTextFn.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("rag");
    expect(callArgs.instructions).toContain("Synthesize");
  });

  it("throws a readable NarrativeGenerationError on failure", async () => {
    const spec = ragDocumentQaSpec();
    const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);
    const generateTextFn = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(runNarrativeGeneration({ spec, plan, generateTextFn })).rejects.toThrow(
      NarrativeGenerationError
    );
  });
});
