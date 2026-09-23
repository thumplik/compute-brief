import type { CanonicalComputeBriefPayload } from "@/lib/export/canonical-json";

/**
 * V1: re-exposes the canonical ComputeBrief payload unchanged. This is the
 * documented extension point for a future ServiceNow-specific field mapping
 * (e.g. mapping `request.requester` to a specific catalog-item variable, or
 * `recommendedNextSteps` to a work-notes field) once a target ServiceNow
 * instance and table/catalog-item schema are known. No live ServiceNow API
 * calls are made by this module.
 */
export function toServiceNowPayload(canonical: CanonicalComputeBriefPayload): CanonicalComputeBriefPayload {
  return canonical;
}
