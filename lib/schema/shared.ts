import { z } from "zod";

export const RangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});
export type Range = z.infer<typeof RangeSchema>;

export const ReadinessSchema = z.enum([
  "early_idea",
  "exploring",
  "prototype",
  "needs_information",
  "needs_data_preparation",
  "needs_access",
  "ready_for_initial_experiment",
  "ready_for_compute_review",
]);
export type Readiness = z.infer<typeof ReadinessSchema>;

export const AccessStatusSchema = z.enum(["confirmed", "likely_required", "unknown", "blocker"]);
export type AccessStatus = z.infer<typeof AccessStatusSchema>;
