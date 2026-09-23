import { z } from "zod";

export const ProvenanceSourceSchema = z.enum(["user_provided", "ai_inferred", "unknown"]);
export type ProvenanceSource = z.infer<typeof ProvenanceSourceSchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export function provenance<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable(),
    source: ProvenanceSourceSchema,
    confidence: ConfidenceSchema.optional(),
    reason: z.string().optional(),
    assumptions: z.array(z.string()).optional(),
  });
}

export interface Provenance<T> {
  value: T | null;
  source: ProvenanceSource;
  confidence?: Confidence;
  reason?: string;
  assumptions?: string[];
}

export function unknownField<T>(): Provenance<T> {
  return { value: null, source: "unknown" };
}

export function userProvided<T>(value: T): Provenance<T> {
  return { value, source: "user_provided" };
}

export function aiInferred<T>(
  value: T,
  confidence: Confidence,
  reason: string,
  assumptions?: string[]
): Provenance<T> {
  return { value, source: "ai_inferred", confidence, reason, assumptions };
}
