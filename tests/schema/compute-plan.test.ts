import { describe, expect, it } from "vitest";
import { ComputePlanSchema } from "@/lib/schema/compute-plan";
import { aiInferred } from "@/lib/schema/provenance";

describe("ComputePlanSchema", () => {
  it("parses a minimal valid plan", () => {
    const plan = ComputePlanSchema.parse({
      recommendedApproach: aiInferred(
        { summary: "Retrieval over existing documents using an existing model.", workloadTypes: ["rag"] },
        "medium",
        "Described as Q&A over an internal document collection."
      ),
      trainingVsInference: aiInferred("inference_only", "medium", "No training signal in the request."),
      initialExperiment: aiInferred(
        { gpuRange: { min: 1, max: 2 }, description: "Small benchmark on the target document set." },
        "medium",
        "Retrieval workloads are inference-only and lightweight to start."
      ),
      overallConfidence: "medium",
    });
    expect(plan.blockers).toEqual([]);
    expect(plan.benchmarkFirstRecommended).toBe(false);
  });

  it("rejects an invalid trainingVsInference value", () => {
    expect(() =>
      ComputePlanSchema.parse({
        recommendedApproach: aiInferred({ summary: "x", workloadTypes: [] }, "low", "r"),
        trainingVsInference: aiInferred("maybe", "low", "r"),
        initialExperiment: aiInferred({ gpuRange: { min: 1, max: 2 }, description: "d" }, "low", "r"),
        overallConfidence: "low",
      })
    ).toThrow();
  });
});
