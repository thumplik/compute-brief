import { describe, expect, it } from "vitest";
import {
  WorkloadSpecSchema,
  emptyWorkloadSpec,
  type WorkloadSpec,
} from "@/lib/schema/workload-spec";
import { userProvided, aiInferred } from "@/lib/schema/provenance";

describe("WorkloadSpecSchema", () => {
  it("parses an empty object into a fully-defaulted spec", () => {
    const spec = emptyWorkloadSpec();
    expect(spec.requester).toEqual({});
    expect(spec.existingAssets).toEqual({});
    expect(spec.dataReadiness).toEqual({});
    expect(spec.blockers).toEqual([]);
    expect(spec.unknowns).toEqual([]);
    expect(spec.readiness).toBe("early_idea");
  });

  it("accepts a partially-filled spec with mixed provenance", () => {
    const spec: WorkloadSpec = {
      ...emptyWorkloadSpec(),
      requester: { organization: userProvided("Acme Robotics") },
      classification: aiInferred(
        ["computer_vision", "inference"],
        "medium",
        "Described as detecting ships in imagery using an existing approach."
      ),
      maturity: aiInferred("idea", "high", "No code or data pipeline exists yet."),
    };
    const parsed = WorkloadSpecSchema.parse(spec);
    expect(parsed.requester.organization?.value).toBe("Acme Robotics");
    expect(parsed.classification?.value).toEqual(["computer_vision", "inference"]);
    expect(parsed.maturity?.value).toBe("idea");
  });

  it("supports existingAssets keyed by asset type", () => {
    const spec: WorkloadSpec = {
      ...emptyWorkloadSpec(),
      existingAssets: {
        training_code: userProvided({
          exists: true,
          locationKnown: true,
          accessible: true,
          computeEnvironmentAccessible: null,
        }),
      },
    };
    const parsed = WorkloadSpecSchema.parse(spec);
    expect(parsed.existingAssets.training_code?.value?.exists).toBe(true);
  });

  it("supports dataReadiness keyed by flag name", () => {
    const spec: WorkloadSpec = {
      ...emptyWorkloadSpec(),
      dataReadiness: {
        data_exists: userProvided(true),
        labeling_required: aiInferred(true, "medium", "Imagery has not been annotated yet."),
      },
    };
    const parsed = WorkloadSpecSchema.parse(spec);
    expect(parsed.dataReadiness.data_exists?.value).toBe(true);
    expect(parsed.dataReadiness.labeling_required?.value).toBe(true);
  });

  it("rejects an invalid workload classification value", () => {
    const bad = {
      ...emptyWorkloadSpec(),
      classification: userProvided(["not_a_real_classification"]),
    };
    expect(() => WorkloadSpecSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid readiness value", () => {
    const bad = { ...emptyWorkloadSpec(), readiness: "almost_ready" };
    expect(() => WorkloadSpecSchema.parse(bad)).toThrow();
  });
});
