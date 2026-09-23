import { describe, expect, it } from "vitest";
import { toCanonicalJSON } from "@/lib/export/canonical-json";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { COMPUTEBRIEF_SCHEMA, COMPUTEBRIEF_SCHEMA_VERSION } from "@/config/export";
import { experiencedVitScalingSpec } from "../fixtures/workload-specs";

describe("toCanonicalJSON", () => {
  const spec = experiencedVitScalingSpec();
  const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);
  const narrative = "# Workload Brief\n\nThis is a narrative.";
  const payload = toCanonicalJSON(spec, plan, narrative);

  it("stamps the schema name and centralized version", () => {
    expect(payload.schema).toBe(COMPUTEBRIEF_SCHEMA);
    expect(payload.schemaVersion).toBe(COMPUTEBRIEF_SCHEMA_VERSION);
  });

  it("includes a valid ISO timestamp and the narrative", () => {
    expect(() => new Date(payload.generatedAt).toISOString()).not.toThrow();
    expect(payload.narrative).toBe(narrative);
  });

  it("serializes to JSON with no undefined values", () => {
    const json = JSON.stringify(payload);
    expect(json).not.toContain("undefined");
    const parsed = JSON.parse(json);
    expect(parsed.schema).toBe(COMPUTEBRIEF_SCHEMA);
  });

  it("represents an unknown field explicitly rather than omitting it", () => {
    expect(payload.access).toBeDefined();
    expect(Array.isArray(payload.blockers)).toBe(true);
    expect(Array.isArray(payload.unknowns)).toBe(true);
  });

  it("preserves provenance on the GPU estimate", () => {
    expect(payload.compute.gpuEstimate).toMatchObject({
      source: "ai_inferred",
    });
    expect(typeof payload.compute.gpuEstimate.confidence).toBe("string");
  });
});
