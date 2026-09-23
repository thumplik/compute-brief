import { WorkloadSpecSchema, type WorkloadSpec, type WorkloadSpecPatch } from "@/lib/schema/workload-spec";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProvenanceLeaf(value: Record<string, unknown>): boolean {
  return "source" in value;
}

export function deepMergePatch<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch)) {
    return patch === undefined ? base : (patch as T);
  }
  if (isProvenanceLeaf(patch)) {
    return patch as T;
  }
  const baseObject = isPlainObject(base) ? base : {};
  const result: Record<string, unknown> = { ...baseObject };
  for (const key of Object.keys(patch)) {
    result[key] = deepMergePatch(
      (baseObject as Record<string, unknown>)[key],
      (patch as Record<string, unknown>)[key]
    );
  }
  return result as T;
}

export function mergeSpecPatch(spec: WorkloadSpec, patch: WorkloadSpecPatch): WorkloadSpec {
  const merged = deepMergePatch(spec, patch);
  return WorkloadSpecSchema.parse(merged);
}
