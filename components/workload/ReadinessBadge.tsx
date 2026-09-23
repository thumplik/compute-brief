import { Badge } from "@/components/ui/badge";
import type { Readiness } from "@/lib/schema/shared";

const READINESS_LABELS: Record<Readiness, string> = {
  early_idea: "Early Idea",
  exploring: "Exploring",
  prototype: "Prototype",
  needs_information: "Needs Information",
  needs_data_preparation: "Needs Data Preparation",
  needs_access: "Needs Access",
  ready_for_initial_experiment: "Ready for Initial Experiment",
  ready_for_compute_review: "Ready for Compute Review",
};

export function ReadinessBadge({ readiness }: { readiness: Readiness }) {
  return <Badge>{READINESS_LABELS[readiness]}</Badge>;
}
