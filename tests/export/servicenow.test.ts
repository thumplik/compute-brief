import { describe, expect, it } from "vitest";
import { toServiceNowPayload } from "@/lib/export/servicenow";
import { toCanonicalJSON } from "@/lib/export/canonical-json";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { ragDocumentQaSpec } from "../fixtures/workload-specs";

describe("toServiceNowPayload", () => {
  it("re-exposes the canonical payload for future mapping", () => {
    const spec = ragDocumentQaSpec();
    const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);
    const canonical = toCanonicalJSON(spec, plan, "narrative text");
    const payload = toServiceNowPayload(canonical);
    expect(payload.schema).toBe(canonical.schema);
    expect(payload.narrative).toBe("narrative text");
  });
});
