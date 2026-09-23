import { describe, expect, it } from "vitest";
import { mergeSpecPatch } from "@/lib/state/merge-patch";
import { emptyWorkloadSpec, type WorkloadSpecPatch } from "@/lib/schema/workload-spec";
import { userProvided, aiInferred } from "@/lib/schema/provenance";

describe("mergeSpecPatch", () => {
  it("merges a single top-level field without touching siblings", () => {
    const spec = {
      ...emptyWorkloadSpec(),
      requester: { organization: userProvided("Acme Robotics"), team: userProvided("Perception") },
    };
    const patch: WorkloadSpecPatch = { requester: { role: userProvided("ML Lead") } };
    const merged = mergeSpecPatch(spec, patch);
    expect(merged.requester.organization?.value).toBe("Acme Robotics");
    expect(merged.requester.team?.value).toBe("Perception");
    expect(merged.requester.role?.value).toBe("ML Lead");
  });

  it("adds a new existingAssets entry without removing prior ones", () => {
    const spec = {
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
    const patch: WorkloadSpecPatch = {
      existingAssets: {
        model_weights: userProvided({
          exists: true,
          locationKnown: false,
          accessible: null,
          computeEnvironmentAccessible: null,
        }),
      },
    };
    const merged = mergeSpecPatch(spec, patch);
    expect(merged.existingAssets.training_code?.value?.exists).toBe(true);
    expect(merged.existingAssets.model_weights?.value?.locationKnown).toBe(false);
  });

  it("replaces a provenance leaf wholesale on correction, not merging stale fields", () => {
    const spec = {
      ...emptyWorkloadSpec(),
      data: { approximateSizeTb: aiInferred(50, "low" as const, "Rough estimate from description.") },
    };
    const patch: WorkloadSpecPatch = { data: { approximateSizeTb: userProvided(5) } };
    const merged = mergeSpecPatch(spec, patch);
    expect(merged.data.approximateSizeTb).toEqual({ value: 5, source: "user_provided" });
    expect(merged.data.approximateSizeTb?.confidence).toBeUndefined();
  });

  it("replaces top-level arrays wholesale", () => {
    const spec = {
      ...emptyWorkloadSpec(),
      blockers: [{ description: "Dataset access not confirmed" }],
    };
    const patch: WorkloadSpecPatch = { blockers: [{ description: "Evaluation criteria undefined" }] };
    const merged = mergeSpecPatch(spec, patch);
    expect(merged.blockers).toEqual([{ description: "Evaluation criteria undefined" }]);
  });

  it("leaves the base spec untouched when the patch omits a field", () => {
    const spec = { ...emptyWorkloadSpec(), readiness: "prototype" as const };
    const merged = mergeSpecPatch(spec, {});
    expect(merged.readiness).toBe("prototype");
  });
});
