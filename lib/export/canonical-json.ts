import type { WorkloadSpec } from "@/lib/schema/workload-spec";
import type { ComputePlan } from "@/lib/schema/compute-plan";
import { COMPUTEBRIEF_SCHEMA, COMPUTEBRIEF_SCHEMA_VERSION } from "@/config/export";

export interface CanonicalComputeBriefPayload {
  schema: string;
  schemaVersion: string;
  generatedAt: string;
  source: string;
  request: {
    requester: WorkloadSpec["requester"];
    problem: WorkloadSpec["problem"];
    successCriteria: WorkloadSpec["successCriteria"];
  };
  workload: {
    classification: WorkloadSpec["classification"] | null;
    maturity: WorkloadSpec["maturity"] | null;
    existingAssets: WorkloadSpec["existingAssets"];
    recommendedApproach: ComputePlan["recommendedApproach"];
    alternativeApproach: ComputePlan["alternativeApproach"] | null;
    trainingVsInference: ComputePlan["trainingVsInference"];
  };
  data: {
    profile: WorkloadSpec["data"];
    readiness: WorkloadSpec["dataReadiness"];
  };
  model: WorkloadSpec["model"];
  compute: {
    requirements: WorkloadSpec["compute"];
    initialExperiment: ComputePlan["initialExperiment"];
    scaledConfiguration: ComputePlan["scaledConfiguration"] | null;
    gpuEstimate: ComputePlan["initialExperiment"];
    cpuCoresRange: ComputePlan["cpuCoresRange"] | null;
    systemRamGbRange: ComputePlan["systemRamGbRange"] | null;
  };
  storage: {
    requirements: WorkloadSpec["storage"];
    estimateTb: ComputePlan["storageEstimateTb"] | null;
  };
  networking: {
    requirements: WorkloadSpec["networking"];
    considerations: string[];
  };
  software: {
    requirements: WorkloadSpec["software"];
    environmentNotes: string[];
  };
  access: {
    items: WorkloadSpec["access"]["items"];
    requiredAccess: string[];
  };
  evaluation: WorkloadSpec["evaluation"];
  deployment: WorkloadSpec["deployment"];
  schedule: WorkloadSpec["timeline"];
  assumptions: string[];
  unknowns: WorkloadSpec["unknowns"];
  blockers: string[];
  recommendedNextSteps: string[];
  readiness: WorkloadSpec["readiness"];
  narrative: string;
}

export function toCanonicalJSON(
  spec: WorkloadSpec,
  plan: ComputePlan,
  narrative: string
): CanonicalComputeBriefPayload {
  return {
    schema: COMPUTEBRIEF_SCHEMA,
    schemaVersion: COMPUTEBRIEF_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "ComputeBrief",
    request: {
      requester: spec.requester,
      problem: spec.problem,
      successCriteria: spec.successCriteria,
    },
    workload: {
      classification: spec.classification ?? null,
      maturity: spec.maturity ?? null,
      existingAssets: spec.existingAssets,
      recommendedApproach: plan.recommendedApproach,
      alternativeApproach: plan.alternativeApproach ?? null,
      trainingVsInference: plan.trainingVsInference,
    },
    data: {
      profile: spec.data,
      readiness: spec.dataReadiness,
    },
    model: spec.model,
    compute: {
      requirements: spec.compute,
      initialExperiment: plan.initialExperiment,
      scaledConfiguration: plan.scaledConfiguration ?? null,
      gpuEstimate: plan.initialExperiment,
      cpuCoresRange: plan.cpuCoresRange ?? null,
      systemRamGbRange: plan.systemRamGbRange ?? null,
    },
    storage: {
      requirements: spec.storage,
      estimateTb: plan.storageEstimateTb ?? null,
    },
    networking: {
      requirements: spec.networking,
      considerations: plan.networkingConsiderations,
    },
    software: {
      requirements: spec.software,
      environmentNotes: plan.softwareEnvironment,
    },
    access: {
      items: spec.access.items,
      requiredAccess: plan.requiredAccess,
    },
    evaluation: spec.evaluation,
    deployment: spec.deployment,
    schedule: spec.timeline,
    assumptions: plan.assumptions,
    unknowns: spec.unknowns,
    blockers: plan.blockers,
    recommendedNextSteps: plan.recommendedNextActions,
    readiness: spec.readiness,
    narrative,
  };
}
