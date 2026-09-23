import { describe, expect, it } from "vitest";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import {
  noviceSatelliteShipsSpec,
  experiencedVitScalingSpec,
  ragDocumentQaSpec,
  earlyIdeaPredictiveMaintenanceSpec,
  correctedDataSizeSpec,
} from "../fixtures/workload-specs";

describe("buildComputePlan", () => {
  it("recommends a small benchmark first for an early idea with no data confirmed", () => {
    const plan = buildComputePlan(earlyIdeaPredictiveMaintenanceSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.benchmarkFirstRecommended).toBe(true);
    expect(plan.overallConfidence).toBe("low");
    expect(plan.trainingVsInference.value).toBe("undetermined");
  });

  it("does not assume training is needed for a RAG-shaped request", () => {
    const plan = buildComputePlan(ragDocumentQaSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.trainingVsInference.value).toBe("inference_only");
    expect(plan.initialExperiment.value!.gpuRange.max).toBeLessThanOrEqual(4);
  });

  it("recommends a benchmark-first small experiment for the novice ships scenario given unconfirmed data access", () => {
    const plan = buildComputePlan(noviceSatelliteShipsSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.benchmarkFirstRecommended).toBe(true);
    expect(
      plan.requiredAccess.some((item) => /compute environment/i.test(item) || /access/i.test(item))
    ).toBe(true);
  });

  it("scales beyond the requester's current GPU count for the scaling scenario", () => {
    const plan = buildComputePlan(experiencedVitScalingSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.benchmarkFirstRecommended).toBe(false);
    expect(plan.scaledConfiguration?.value!.gpuRange.min).toBeGreaterThan(8);
    expect(plan.trainingVsInference.value).toBe("fine_tune_existing");
  });

  it("recomputes cleanly when the dataset size is corrected downward", () => {
    const original = buildComputePlan(experiencedVitScalingSpec(), MVP_CLUSTER_PROFILE);
    const corrected = buildComputePlan(correctedDataSizeSpec(), MVP_CLUSTER_PROFILE);
    expect(original.trainingVsInference.value).toBe(corrected.trainingVsInference.value);
    expect(corrected.benchmarkFirstRecommended).toBe(false);
  });

  it("is willing to say a large allocation is not yet justified", () => {
    const plan = buildComputePlan(earlyIdeaPredictiveMaintenanceSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.recommendedNextActions.some((a) => /benchmark/i.test(a))).toBe(true);
  });
});
