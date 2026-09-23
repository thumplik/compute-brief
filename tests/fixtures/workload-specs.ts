import { emptyWorkloadSpec, type WorkloadSpec } from "@/lib/schema/workload-spec";
import { userProvided, aiInferred } from "@/lib/schema/provenance";

export function noviceSatelliteShipsSpec(): WorkloadSpec {
  return {
    ...emptyWorkloadSpec(),
    problem: {
      statement: userProvided("Automatically identify ships in satellite imagery."),
    },
    classification: aiInferred(
      ["computer_vision", "supervised_training"],
      "medium",
      "Described as detecting objects (ships) in imagery; architecture not yet chosen."
    ),
    maturity: aiInferred("idea", "high", "No model, code, or data pipeline described yet."),
    data: {
      modality: userProvided("images"),
    },
    dataReadiness: {
      data_exists: userProvided(true),
      data_location_known: aiInferred(
        true,
        "low",
        "Requester said imagery 'already exists somewhere on our network' but exact location is unconfirmed."
      ),
      compute_environment_has_access: userProvided(false),
    },
  };
}

export function experiencedVitScalingSpec(): WorkloadSpec {
  return {
    ...emptyWorkloadSpec(),
    problem: {
      statement: userProvided("Scale existing ViT-L training to iterate faster."),
    },
    classification: userProvided(["computer_vision", "fine_tuning"]),
    maturity: aiInferred("scaling", "high", "Working checkpoint and training pipeline already in use on 8 GPUs."),
    model: {
      baseModel: userProvided("ViT-L"),
    },
    data: {
      approximateSizeTb: userProvided(18),
      labelStatus: userProvided("fully_labeled"),
    },
    dataReadiness: {
      data_exists: userProvided(true),
      data_location_known: userProvided(true),
      requester_has_access: userProvided(true),
      compute_environment_has_access: userProvided(true),
    },
    compute: {
      currentGpuCount: userProvided(8),
      expectedRuntime: userProvided("~4 days per training run"),
    },
    existingAssets: {
      training_code: userProvided({
        exists: true,
        locationKnown: true,
        accessible: true,
        computeEnvironmentAccessible: true,
      }),
      checkpoint: userProvided({
        exists: true,
        locationKnown: true,
        accessible: true,
        computeEnvironmentAccessible: true,
      }),
    },
  };
}

export function ragDocumentQaSpec(): WorkloadSpec {
  return {
    ...emptyWorkloadSpec(),
    problem: {
      statement: userProvided("Let employees ask questions about our internal documents."),
    },
    classification: aiInferred(
      ["rag", "nlp", "inference"],
      "medium",
      "Q&A over an existing document collection is a retrieval task, not a training task."
    ),
    maturity: aiInferred("exploration", "medium", "Idea is clear but no retrieval pipeline exists yet."),
    data: {
      modality: userProvided("documents"),
    },
    dataReadiness: {
      data_exists: userProvided(true),
      data_location_known: userProvided(true),
    },
  };
}

export function earlyIdeaPredictiveMaintenanceSpec(): WorkloadSpec {
  return {
    ...emptyWorkloadSpec(),
    problem: {
      statement: userProvided("Maybe use AI to predict equipment failures."),
    },
    maturity: aiInferred("idea", "high", "No historical data, model, or pipeline described yet."),
    unknowns: [
      {
        description: "Whether historical failure data exists and in what form.",
        affects: ["feasibility", "compute_sizing"],
      },
    ],
  };
}

export function correctedDataSizeSpec(): WorkloadSpec {
  const base = experiencedVitScalingSpec();
  return {
    ...base,
    data: { ...base.data, approximateSizeTb: userProvided(5) },
  };
}
