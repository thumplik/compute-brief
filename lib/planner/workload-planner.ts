import { z } from "zod";
import type { WorkloadSpec } from "@/lib/schema/workload-spec";
import type { ClusterProfile } from "@/config/cluster-profile";
import { ComputePlanSchema, type ComputePlan, TrainingVsInferenceSchema } from "@/lib/schema/compute-plan";
import type { Confidence } from "@/lib/schema/provenance";

type TrainingVsInference = z.infer<typeof TrainingVsInferenceSchema>;

const INFERENCE_CLASSIFICATIONS = new Set([
  "inference",
  "batch_inference",
  "online_inference",
  "rag",
  "embeddings",
  "evaluation",
]);
const FINE_TUNE_CLASSIFICATIONS = new Set(["fine_tuning", "parameter_efficient_fine_tuning"]);
const TRAIN_CLASSIFICATIONS = new Set(["model_pretraining", "supervised_training", "self_supervised_training"]);

function deriveTrainingVsInference(classification: string[]): TrainingVsInference {
  if (classification.length === 0) return "undetermined";
  const hasTrain = classification.some((c) => TRAIN_CLASSIFICATIONS.has(c));
  const hasFineTune = classification.some((c) => FINE_TUNE_CLASSIFICATIONS.has(c));
  const hasInferenceOnly = classification.some((c) => INFERENCE_CLASSIFICATIONS.has(c));
  if (hasTrain && (hasFineTune || hasInferenceOnly)) return "hybrid";
  if (hasFineTune) return "fine_tune_existing";
  if (hasTrain) return "train_new_model";
  if (hasInferenceOnly) return "inference_only";
  return "undetermined";
}

const DEFAULT_RANGES: Record<TrainingVsInference, { initial: [number, number]; scaled: [number, number] }> = {
  train_new_model: { initial: [4, 8], scaled: [16, 32] },
  fine_tune_existing: { initial: [4, 8], scaled: [8, 16] },
  inference_only: { initial: [1, 2], scaled: [2, 4] },
  hybrid: { initial: [4, 8], scaled: [16, 32] },
  undetermined: { initial: [1, 4], scaled: [4, 8] },
};

function hasEnoughSignal(spec: WorkloadSpec): boolean {
  const maturity = spec.maturity?.value;
  if (maturity === "idea" || maturity === "exploration") return false;
  const dataExists = spec.dataReadiness?.data_exists?.value;
  if (dataExists === false || dataExists == null) {
    if (spec.data?.approximateSizeTb?.value == null) return false;
  }
  return true;
}

function summarizeApproach(t: TrainingVsInference): string {
  switch (t) {
    case "inference_only":
      return "This workload appears well suited to inference over an existing model rather than training a new one.";
    case "fine_tune_existing":
      return "This workload appears to call for fine-tuning or scaling an existing model rather than starting from scratch.";
    case "train_new_model":
      return "This workload appears to require training a new model.";
    case "hybrid":
      return "This workload appears to combine training or fine-tuning with an inference or evaluation component.";
    default:
      return "There is not yet enough information to recommend a specific technical approach.";
  }
}

export function buildComputePlan(spec: WorkloadSpec, _clusterProfile: ClusterProfile): ComputePlan {
  const classification = spec.classification?.value ?? [];
  const trainingVsInference = deriveTrainingVsInference(classification);
  const enoughSignal = hasEnoughSignal(spec);
  const benchmarkFirst = !enoughSignal || trainingVsInference === "undetermined";
  const defaults = DEFAULT_RANGES[trainingVsInference];
  const confidence: Confidence = benchmarkFirst ? "low" : "medium";

  const currentGpus = spec.compute?.currentGpuCount?.value ?? null;
  let scaledMin = defaults.scaled[0];
  let scaledMax = defaults.scaled[1];
  if (currentGpus != null && currentGpus >= scaledMin) {
    scaledMin = currentGpus * 2;
    scaledMax = currentGpus * 4;
  }

  const dataBlockers: string[] = [];
  if (spec.dataReadiness?.compute_environment_has_access?.value !== true) {
    dataBlockers.push("Compute environment access to the data has not been confirmed.");
  }
  if (spec.dataReadiness?.data_location_known?.value === false) {
    dataBlockers.push("Data location is not yet confirmed.");
  }

  const specBlockers = spec.blockers.map((b) => b.description);
  const accessBlockers = spec.access.items
    .filter((a) => a.status === "blocker")
    .map((a) => `Access blocker: ${a.name}`);
  const blockers = [...specBlockers, ...accessBlockers];

  const requiredAccess = [
    ...spec.access.items
      .filter((a) => a.status === "likely_required" || a.status === "unknown")
      .map((a) => `${a.name}${a.status === "unknown" ? " (status unknown)" : ""}`),
    ...dataBlockers,
  ];

  const unresolvedQuestions = spec.unknowns
    .filter((u) => !u.affects || u.affects.some((a) => ["feasibility", "compute_sizing", "architecture"].includes(a)))
    .map((u) => u.description);

  const recommendedNextActions: string[] = [];
  if (benchmarkFirst) {
    recommendedNextActions.push(
      "Run a small benchmark to establish a compute and data-loading baseline before committing to a larger allocation."
    );
  }
  if (dataBlockers.length > 0) {
    recommendedNextActions.push("Confirm and verify data access from the target compute environment.");
  }
  if (blockers.length > 0) {
    recommendedNextActions.push("Resolve outstanding blockers before requesting a larger compute allocation.");
  }
  if (recommendedNextActions.length === 0) {
    recommendedNextActions.push("Proceed to a compute review with the current workload brief.");
  }

  const cpuCoresRange = { min: defaults.initial[0] * 8, max: scaledMax * 16 };
  const systemRamGbRange = { min: defaults.initial[0] * 32, max: scaledMax * 64 };

  const plan: ComputePlan = {
    recommendedApproach: {
      value: { summary: summarizeApproach(trainingVsInference), workloadTypes: classification },
      source: "ai_inferred",
      confidence,
      reason: "Based on the stated workload classification and maturity.",
    },
    trainingVsInference: {
      value: trainingVsInference,
      source: "ai_inferred",
      confidence,
      reason: benchmarkFirst
        ? "Classification or maturity signal is not yet clear enough to commit to one path."
        : "Derived from the stated workload classification.",
    },
    initialExperiment: {
      value: {
        gpuRange: { min: defaults.initial[0], max: defaults.initial[1] },
        description: benchmarkFirst
          ? "Run a small benchmark first to establish a baseline before committing to a larger allocation."
          : `Initial experiment sized to validate the ${trainingVsInference.replace(/_/g, " ")} approach and surface data-loading or scaling bottlenecks.`,
      },
      source: "ai_inferred",
      confidence,
      reason: benchmarkFirst
        ? "Maturity or data readiness is not yet established, so sizing is provisional."
        : "Derived from the workload classification and stated maturity/data signals.",
    },
    scaledConfiguration: benchmarkFirst
      ? undefined
      : {
          value: {
            gpuRange: { min: scaledMin, max: scaledMax },
            description:
              currentGpus != null
                ? `A scaled allocation beyond the current ${currentGpus}-GPU setup, once the initial benchmark confirms scaling behavior.`
                : "A scaled allocation for the full workload, once the initial benchmark confirms scaling behavior.",
          },
          source: "ai_inferred",
          confidence,
          reason: "Scaled from the initial-experiment range and, where known, the requester's current GPU usage.",
          assumptions: [
            "Distributed training scales reasonably across this GPU range",
            "Data loading is not the primary bottleneck",
          ],
        },
    cpuCoresRange: {
      value: cpuCoresRange,
      source: "ai_inferred",
      confidence: "low",
      reason: "Approximated from the GPU allocation using a generic ratio; refine once workload specifics are known.",
    },
    systemRamGbRange: {
      value: systemRamGbRange,
      source: "ai_inferred",
      confidence: "low",
      reason: "Approximated from the GPU allocation using a generic ratio; refine once workload specifics are known.",
    },
    ioConsiderations: benchmarkFirst
      ? []
      : ["Validate data-loading throughput does not bottleneck GPU utilization at the initial-experiment scale."],
    networkingConsiderations:
      trainingVsInference === "train_new_model" || trainingVsInference === "hybrid"
        ? ["Multi-node distributed training will likely require a high-speed interconnect between nodes."]
        : [],
    distributedExecutionConsiderations:
      scaledMin > defaults.initial[1]
        ? ["Scaling beyond a single node will require a distributed training or serving strategy."]
        : [],
    softwareEnvironment: [],
    requiredAccess,
    assumptions: benchmarkFirst
      ? ["No large allocation is assumed until the initial benchmark and data access are confirmed."]
      : ["Distributed execution is supported at the recommended scale."],
    overallConfidence: confidence,
    blockers,
    unresolvedQuestions,
    recommendedNextActions,
    benchmarkFirstRecommended: benchmarkFirst,
  };

  return ComputePlanSchema.parse(plan);
}
