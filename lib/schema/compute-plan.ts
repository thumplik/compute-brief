import { z } from "zod";
import { provenance, ConfidenceSchema } from "@/lib/schema/provenance";
import { RangeSchema } from "@/lib/schema/shared";
import { WorkloadClassificationSchema } from "@/lib/schema/workload-spec";

const ApproachSchema = z.object({
  summary: z.string(),
  workloadTypes: z.array(WorkloadClassificationSchema),
});

const GpuAllocationSchema = z.object({
  gpuRange: RangeSchema,
  gpuType: z.string().optional(),
  description: z.string(),
});

export const TrainingVsInferenceSchema = z.enum([
  "train_new_model",
  "fine_tune_existing",
  "inference_only",
  "hybrid",
  "undetermined",
]);

export const ComputePlanSchema = z.object({
  recommendedApproach: provenance(ApproachSchema),
  alternativeApproach: provenance(ApproachSchema).optional(),
  trainingVsInference: provenance(TrainingVsInferenceSchema),
  initialExperiment: provenance(GpuAllocationSchema),
  scaledConfiguration: provenance(GpuAllocationSchema).optional(),
  cpuCoresRange: provenance(RangeSchema).optional(),
  systemRamGbRange: provenance(RangeSchema).optional(),
  storageEstimateTb: provenance(RangeSchema).optional(),
  ioConsiderations: z.array(z.string()).default([]),
  networkingConsiderations: z.array(z.string()).default([]),
  distributedExecutionConsiderations: z.array(z.string()).default([]),
  softwareEnvironment: z.array(z.string()).default([]),
  requiredAccess: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  overallConfidence: ConfidenceSchema,
  blockers: z.array(z.string()).default([]),
  unresolvedQuestions: z.array(z.string()).default([]),
  recommendedNextActions: z.array(z.string()).default([]),
  benchmarkFirstRecommended: z.boolean().default(false),
});

export type ComputePlan = z.infer<typeof ComputePlanSchema>;
