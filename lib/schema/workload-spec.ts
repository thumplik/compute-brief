import { z } from "zod";
import { provenance } from "@/lib/schema/provenance";
import { ReadinessSchema, AccessStatusSchema } from "@/lib/schema/shared";

export const WorkloadClassificationSchema = z.enum([
  "traditional_machine_learning",
  "deep_learning",
  "computer_vision",
  "nlp",
  "multimodal",
  "llm",
  "model_pretraining",
  "supervised_training",
  "self_supervised_training",
  "fine_tuning",
  "parameter_efficient_fine_tuning",
  "inference",
  "batch_inference",
  "online_inference",
  "embeddings",
  "rag",
  "evaluation",
  "synthetic_data",
  "reinforcement_learning",
  "simulation",
  "hpc",
  "data_processing",
  "other",
]);
export type WorkloadClassification = z.infer<typeof WorkloadClassificationSchema>;

export const MaturityLevelSchema = z.enum([
  "idea",
  "exploration",
  "prototype",
  "training_ready",
  "scaling",
  "operationalizing",
]);
export type MaturityLevel = z.infer<typeof MaturityLevelSchema>;

export const AssetTypeSchema = z.enum([
  "source_code",
  "git_repository",
  "notebooks",
  "scripts",
  "existing_model",
  "model_weights",
  "checkpoint",
  "training_code",
  "inference_code",
  "container_image",
  "requirements_file",
  "existing_deployment",
  "experiment_logs",
  "benchmark_results",
  "evaluation_datasets",
  "documentation",
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const AssetStatusSchema = z.object({
  exists: z.boolean().nullable(),
  locationKnown: z.boolean().nullable(),
  accessible: z.boolean().nullable(),
  computeEnvironmentAccessible: z.boolean().nullable(),
  description: z.string().optional(),
});
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

export const DataReadinessFlagSchema = z.enum([
  "data_exists",
  "data_location_known",
  "requester_has_access",
  "compute_environment_has_access",
  "labeling_required",
  "cleaning_required",
  "normalization_required",
  "transformation_required",
  "conversion_required",
  "deduplication_required",
  "tiling_required",
  "chunking_required",
  "tokenization_required",
  "augmentation_required",
  "filtering_required",
  "train_validation_test_split_required",
  "quality_assessment_required",
  "other_preparation_required",
]);
export type DataReadinessFlag = z.infer<typeof DataReadinessFlagSchema>;

export const DataModalitySchema = z.enum([
  "images",
  "video",
  "text",
  "documents",
  "tabular",
  "audio",
  "time_series",
  "geospatial",
  "multimodal",
  "other",
]);

export const LabelStatusSchema = z.enum(["unlabeled", "partially_labeled", "fully_labeled", "unknown"]);
export const SplitStatusSchema = z.enum(["no_split", "has_split", "unknown"]);
export const SyntheticVsRealSchema = z.enum(["real", "synthetic", "mixed"]);

export const WorkloadPhaseSchema = z.enum([
  "experimentation",
  "training",
  "fine_tuning",
  "inference",
  "evaluation",
  "data_processing",
]);

export const DeploymentTargetSchema = z.enum([
  "research_experiment",
  "proof_of_concept",
  "trained_weights",
  "exported_model",
  "batch_pipeline",
  "scheduled_pipeline",
  "api",
  "interactive_service",
  "user_facing_application",
  "embedded_capability",
  "edge_deployment",
  "report_or_artifact",
  "dataset",
  "synthetic_dataset",
  "other",
]);

export const UnknownImpactSchema = z.enum([
  "feasibility",
  "cost",
  "compute_sizing",
  "access",
  "architecture",
  "schedule",
  "evaluation",
  "operationalization",
]);

const RequesterSchema = z.object({
  name: provenance(z.string()).optional(),
  organization: provenance(z.string()).optional(),
  team: provenance(z.string()).optional(),
  role: provenance(z.string()).optional(),
  email: provenance(z.string()).optional(),
  technicalContact: provenance(z.string()).optional(),
  projectName: provenance(z.string()).optional(),
  sponsoringOrganization: provenance(z.string()).optional(),
});

const ProblemSchema = z.object({
  statement: provenance(z.string()).optional(),
  intendedUsers: provenance(z.string()).optional(),
  currentWorkflow: provenance(z.string()).optional(),
  currentPainPoints: provenance(z.string()).optional(),
  desiredCapability: provenance(z.string()).optional(),
  desiredOutputs: provenance(z.string()).optional(),
  expectedValue: provenance(z.string()).optional(),
  reasonForRequest: provenance(z.string()).optional(),
});

const SuccessCriteriaSchema = z.object({
  desiredBehavior: provenance(z.string()).optional(),
  quantitativeMetrics: provenance(z.array(z.string())).optional(),
  qualitativeCriteria: provenance(z.string()).optional(),
  latencyRequirement: provenance(z.string()).optional(),
  throughputRequirement: provenance(z.string()).optional(),
  accuracyTarget: provenance(z.string()).optional(),
  precisionVsRecallNote: provenance(z.string()).optional(),
  baselineToBeat: provenance(z.string()).optional(),
  operationalConstraints: provenance(z.string()).optional(),
});

const ModelInfoSchema = z.object({
  family: provenance(z.string()).optional(),
  architecture: provenance(z.string()).optional(),
  candidateModel: provenance(z.string()).optional(),
  baseModel: provenance(z.string()).optional(),
  parameterCount: provenance(z.string()).optional(),
  trainingStrategy: provenance(z.string()).optional(),
  fineTuningStrategy: provenance(z.string()).optional(),
  precision: provenance(z.string()).optional(),
  quantization: provenance(z.string()).optional(),
  contextLength: provenance(z.number()).optional(),
  inputResolution: provenance(z.string()).optional(),
  batchSize: provenance(z.number()).optional(),
  optimizer: provenance(z.string()).optional(),
  parallelismStrategy: provenance(z.string()).optional(),
});

const DataSchema = z.object({
  modality: provenance(DataModalitySchema).optional(),
  source: provenance(z.string()).optional(),
  location: provenance(z.string()).optional(),
  approximateSizeTb: provenance(z.number()).optional(),
  sampleCount: provenance(z.number()).optional(),
  fileCount: provenance(z.number()).optional(),
  format: provenance(z.string()).optional(),
  labelStatus: provenance(LabelStatusSchema).optional(),
  labelType: provenance(z.string()).optional(),
  splitStatus: provenance(SplitStatusSchema).optional(),
  syntheticVsReal: provenance(SyntheticVsRealSchema).optional(),
  updateFrequency: provenance(z.string()).optional(),
  sensitivity: provenance(z.string()).optional(),
});

const ComputeRequirementsSchema = z.object({
  workloadPhase: provenance(WorkloadPhaseSchema).optional(),
  cpuOnlyViable: provenance(z.boolean()).optional(),
  acceleratorRequired: provenance(z.boolean()).optional(),
  candidateGpuType: provenance(z.string()).optional(),
  currentGpuCount: provenance(z.number()).optional(),
  minimumViableGpus: provenance(z.number()).optional(),
  gpuCountRange: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  scaledGpuRange: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  vramRequirementGb: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  multiNodeRequired: provenance(z.boolean()).optional(),
  distributedTrainingRequired: provenance(z.boolean()).optional(),
  cpuCoresRange: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  systemRamGbRange: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  expectedRuntime: provenance(z.string()).optional(),
  experimentFrequency: provenance(z.string()).optional(),
  interactiveVsBatch: provenance(z.enum(["interactive", "batch", "both"])).optional(),
});

const StorageSchema = z.object({
  sourceDataStorage: provenance(z.string()).optional(),
  scratchStorageTb: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  checkpointStorageTb: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  artifactStorageTb: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  readThroughputNote: provenance(z.string()).optional(),
  writeThroughputNote: provenance(z.string()).optional(),
  sharedFilesystemRequired: provenance(z.boolean()).optional(),
  localNvmeUseful: provenance(z.boolean()).optional(),
  retentionNote: provenance(z.string()).optional(),
});

const NetworkingSchema = z.object({
  multiNodeCommunicationRequired: provenance(z.boolean()).optional(),
  highSpeedInterconnectRequired: provenance(z.boolean()).optional(),
  externalApiDependencies: provenance(z.array(z.string())).optional(),
  internetRequired: provenance(z.boolean()).optional(),
  modelRepositoryAccessRequired: provenance(z.boolean()).optional(),
  egressRequired: provenance(z.boolean()).optional(),
  inboundServiceRequired: provenance(z.boolean()).optional(),
});

const SoftwareEnvironmentSchema = z.object({
  language: provenance(z.string()).optional(),
  pythonVersion: provenance(z.string()).optional(),
  frameworks: provenance(z.array(z.string())).optional(),
  distributedFrameworks: provenance(z.array(z.string())).optional(),
  cudaVersion: provenance(z.string()).optional(),
  containerRequired: provenance(z.boolean()).optional(),
  containerImage: provenance(z.string()).optional(),
  packageRepositories: provenance(z.array(z.string())).optional(),
  modelRepositories: provenance(z.array(z.string())).optional(),
  gitRepositories: provenance(z.array(z.string())).optional(),
  additionalPackages: provenance(z.array(z.string())).optional(),
});

const AccessItemSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  status: AccessStatusSchema,
  notes: z.string().optional(),
});
export type AccessItem = z.infer<typeof AccessItemSchema>;

const EvaluationSchema = z.object({
  validationDataset: provenance(z.string()).optional(),
  testDataset: provenance(z.string()).optional(),
  benchmark: provenance(z.string()).optional(),
  baseline: provenance(z.string()).optional(),
  quantitativeMetrics: provenance(z.array(z.string())).optional(),
  humanEvaluationPlan: provenance(z.string()).optional(),
  hasEvaluationPlan: provenance(z.boolean()).optional(),
});

const DeploymentSchema = z.object({
  outputTarget: provenance(DeploymentTargetSchema).optional(),
  servingNotes: provenance(z.string()).optional(),
});

const TimelineSchema = z.object({
  startDate: provenance(z.string()).optional(),
  deadline: provenance(z.string()).optional(),
  cadence: provenance(z.enum(["one_time", "recurring"])).optional(),
  urgencyNote: provenance(z.string()).optional(),
});

const BlockerSchema = z.object({
  description: z.string(),
  category: z.string().optional(),
  severity: z.enum(["high", "medium", "low"]).optional(),
});
export type Blocker = z.infer<typeof BlockerSchema>;

const UnknownSchema = z.object({
  description: z.string(),
  affects: z.array(UnknownImpactSchema).optional(),
});
export type WorkloadUnknown = z.infer<typeof UnknownSchema>;

export const WorkloadSpecSchema = z.object({
  requester: RequesterSchema.default({}),
  problem: ProblemSchema.default({}),
  successCriteria: SuccessCriteriaSchema.default({}),
  classification: provenance(z.array(WorkloadClassificationSchema)).optional(),
  maturity: provenance(MaturityLevelSchema).optional(),
  existingAssets: z.record(z.string(), provenance(AssetStatusSchema)).default({}),
  model: ModelInfoSchema.default({}),
  data: DataSchema.default({}),
  dataReadiness: z.record(z.string(), provenance(z.boolean())).default({}),
  compute: ComputeRequirementsSchema.default({}),
  storage: StorageSchema.default({}),
  networking: NetworkingSchema.default({}),
  software: SoftwareEnvironmentSchema.default({}),
  access: z.object({ items: z.array(AccessItemSchema).default([]) }).default({ items: [] }),
  evaluation: EvaluationSchema.default({}),
  deployment: DeploymentSchema.default({}),
  timeline: TimelineSchema.default({}),
  blockers: z.array(BlockerSchema).default([]),
  unknowns: z.array(UnknownSchema).default([]),
  readiness: ReadinessSchema.default("early_idea"),
});

export type WorkloadSpec = z.infer<typeof WorkloadSpecSchema>;

export function emptyWorkloadSpec(): WorkloadSpec {
  return WorkloadSpecSchema.parse({});
}

/**
 * Zod v4 removed `.deepPartial()`. A patch coming back from the model is
 * untrusted JSON, so it is validated only loosely here (must be a plain
 * object); the *merged* result is what gets validated strictly against
 * WorkloadSpecSchema (see lib/state/merge-patch.ts). DeepPartial<WorkloadSpec>
 * exists purely as a compile-time authoring aid for tests/fixtures.
 */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type WorkloadSpecPatch = DeepPartial<WorkloadSpec>;

export const WorkloadSpecPatchSchema = z.record(z.string(), z.unknown());
