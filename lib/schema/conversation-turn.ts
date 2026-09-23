import { z } from "zod";
import { WorkloadSpecPatchSchema } from "@/lib/schema/workload-spec";
import { ReadinessSchema } from "@/lib/schema/shared";

export const TurnResultSchema = z.object({
  assistantMessage: z.string().min(1),
  specPatch: WorkloadSpecPatchSchema,
  nextQuestion: z.string().nullable(),
  readiness: ReadinessSchema,
});

export type TurnResult = z.infer<typeof TurnResultSchema>;
