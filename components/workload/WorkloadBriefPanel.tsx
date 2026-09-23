"use client";

import { useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/workload/Section";
import { ProvenanceRow } from "@/components/workload/ProvenanceRow";
import { ReadinessBadge } from "@/components/workload/ReadinessBadge";
import { useWorkload } from "@/lib/state/workload-context";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { formatRange, titleCase } from "@/lib/format";

const ALL_SECTIONS = [
  "Use Case",
  "Requester",
  "Maturity",
  "Proposed Approach",
  "Existing Assets",
  "Data",
  "Data Readiness",
  "Model",
  "Compute",
  "Storage",
  "Software",
  "Networking",
  "Access & Permissions",
  "Evaluation",
  "Deployment",
  "Timeline",
  "Blockers",
  "Important Unknowns",
];

export function WorkloadBriefPanel() {
  const { spec } = useWorkload();
  const plan = useMemo(() => buildComputePlan(spec, MVP_CLUSTER_PROFILE), [spec]);

  return (
    <aside className="flex h-full flex-col overflow-hidden border-t bg-muted/20 md:border-t-0 md:border-l">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Live Workload Brief</h2>
        <ReadinessBadge readiness={spec.readiness} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <Accordion defaultValue={ALL_SECTIONS} className="space-y-1">
          <Section title="Use Case">
            <ProvenanceRow label="Problem statement" field={spec.problem.statement} />
            <ProvenanceRow label="Desired capability" field={spec.problem.desiredCapability} />
            <ProvenanceRow label="Desired outputs" field={spec.problem.desiredOutputs} />
            <ProvenanceRow label="Intended users" field={spec.problem.intendedUsers} />
            <ProvenanceRow label="Current workflow" field={spec.problem.currentWorkflow} />
            <ProvenanceRow label="Current pain points" field={spec.problem.currentPainPoints} />
            <ProvenanceRow label="Expected value" field={spec.problem.expectedValue} />
            <ProvenanceRow label="Reason for request" field={spec.problem.reasonForRequest} />
            <ProvenanceRow label="Desired behavior" field={spec.successCriteria.desiredBehavior} />
            <ProvenanceRow label="Quantitative metrics" field={spec.successCriteria.quantitativeMetrics} />
            <ProvenanceRow label="Qualitative criteria" field={spec.successCriteria.qualitativeCriteria} />
            <ProvenanceRow label="Baseline to beat" field={spec.successCriteria.baselineToBeat} />
          </Section>

          <Section title="Requester">
            <ProvenanceRow label="Name" field={spec.requester.name} />
            <ProvenanceRow label="Organization" field={spec.requester.organization} />
            <ProvenanceRow label="Team" field={spec.requester.team} />
            <ProvenanceRow label="Role" field={spec.requester.role} />
            <ProvenanceRow label="Project name" field={spec.requester.projectName} />
            <ProvenanceRow label="Sponsoring organization" field={spec.requester.sponsoringOrganization} />
          </Section>

          <Section title="Maturity">
            <ProvenanceRow
              label="Maturity level"
              field={
                spec.maturity
                  ? { ...spec.maturity, value: spec.maturity.value ? titleCase(spec.maturity.value) : null }
                  : undefined
              }
            />
          </Section>

          <Section title="Proposed Approach">
            <div className="py-1.5">
              <p>{plan.recommendedApproach.value?.summary}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {plan.recommendedApproach.value?.workloadTypes.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {titleCase(t)}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-[10px]">
                  AI inferred
                  {plan.recommendedApproach.confidence ? ` · ${plan.recommendedApproach.confidence} confidence` : ""}
                </Badge>
              </div>
              {plan.recommendedApproach.reason && (
                <p className="mt-1 text-xs text-muted-foreground">{plan.recommendedApproach.reason}</p>
              )}
            </div>
            {plan.alternativeApproach && (
              <div className="py-1.5">
                <p className="text-xs font-medium text-muted-foreground">Alternative approach</p>
                <p>{plan.alternativeApproach.value?.summary}</p>
              </div>
            )}
          </Section>

          <Section title="Existing Assets">
            {Object.entries(spec.existingAssets).map(([assetType, field]) => {
              const status = field.value;
              const flags = status
                ? [
                    status.exists ? "exists" : null,
                    status.locationKnown ? "location known" : null,
                    status.accessible ? "accessible" : null,
                    status.computeEnvironmentAccessible ? "reachable from compute env" : null,
                  ].filter(Boolean)
                : [];
              return (
                <div key={assetType} className="py-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">{titleCase(assetType)}</span>
                    <span className="text-right text-xs">
                      {flags.length > 0 ? flags.join(", ") : "status unknown"}
                    </span>
                  </div>
                  {status?.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{status.description}</p>
                  )}
                </div>
              );
            })}
          </Section>

          <Section title="Data">
            <ProvenanceRow label="Modality" field={spec.data.modality} />
            <ProvenanceRow label="Source" field={spec.data.source} />
            <ProvenanceRow label="Location" field={spec.data.location} />
            <ProvenanceRow
              label="Approximate size"
              field={
                spec.data.approximateSizeTb
                  ? { ...spec.data.approximateSizeTb, value: spec.data.approximateSizeTb.value != null ? `${spec.data.approximateSizeTb.value} TB` : null }
                  : undefined
              }
            />
            <ProvenanceRow label="Sample count" field={spec.data.sampleCount} />
            <ProvenanceRow label="Format" field={spec.data.format} />
            <ProvenanceRow label="Label status" field={spec.data.labelStatus} />
            <ProvenanceRow label="Split status" field={spec.data.splitStatus} />
            <ProvenanceRow label="Synthetic vs. real" field={spec.data.syntheticVsReal} />
          </Section>

          <Section title="Data Readiness">
            {Object.entries(spec.dataReadiness).map(([flag, field]) => (
              <ProvenanceRow key={flag} label={titleCase(flag)} field={field} />
            ))}
          </Section>

          <Section title="Model">
            <ProvenanceRow label="Family" field={spec.model.family} />
            <ProvenanceRow label="Base model" field={spec.model.baseModel} />
            <ProvenanceRow label="Candidate model" field={spec.model.candidateModel} />
            <ProvenanceRow label="Parameter count" field={spec.model.parameterCount} />
            <ProvenanceRow label="Fine-tuning strategy" field={spec.model.fineTuningStrategy} />
            <ProvenanceRow label="Precision" field={spec.model.precision} />
          </Section>

          <Section title="Compute">
            <div className="py-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Initial experiment</span>
                <span className="text-right font-medium">
                  {formatRange(plan.initialExperiment.value?.gpuRange, "GPUs")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{plan.initialExperiment.value?.description}</p>
            </div>
            {plan.scaledConfiguration && (
              <div className="py-1.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Likely scaled workload</span>
                  <span className="text-right font-medium">
                    {formatRange(plan.scaledConfiguration.value?.gpuRange, "GPUs")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.scaledConfiguration.value?.description}</p>
              </div>
            )}
            {plan.benchmarkFirstRecommended && (
              <div className="py-1.5">
                <Badge variant="outline" className="text-[10px]">
                  Benchmark recommended before scaling
                </Badge>
              </div>
            )}
            <ProvenanceRow label="Current GPU usage" field={spec.compute.currentGpuCount} />
            <ProvenanceRow label="Expected runtime" field={spec.compute.expectedRuntime} />
            <ProvenanceRow label="Experiment frequency" field={spec.compute.experimentFrequency} />
          </Section>

          <Section title="Storage">
            <ProvenanceRow label="Source data storage" field={spec.storage.sourceDataStorage} />
            <ProvenanceRow label="Retention" field={spec.storage.retentionNote} />
          </Section>

          <Section title="Software">
            <ProvenanceRow label="Language" field={spec.software.language} />
            <ProvenanceRow label="Frameworks" field={spec.software.frameworks} />
            <ProvenanceRow label="Distributed frameworks" field={spec.software.distributedFrameworks} />
            <ProvenanceRow label="Container image" field={spec.software.containerImage} />
          </Section>

          <Section title="Networking">
            <ProvenanceRow label="Multi-node communication" field={spec.networking.multiNodeCommunicationRequired} />
            <ProvenanceRow label="External API dependencies" field={spec.networking.externalApiDependencies} />
            <ProvenanceRow label="Internet required" field={spec.networking.internetRequired} />
            {plan.networkingConsiderations.length > 0 && (
              <div className="py-1.5">
                <p className="text-xs font-medium text-muted-foreground">Considerations</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {plan.networkingConsiderations.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section title="Access & Permissions">
            {spec.access.items.map((item) => (
              <div key={item.name} className="flex items-start justify-between gap-3 py-1.5">
                <span className="text-muted-foreground">{item.name}</span>
                <Badge variant={item.status === "blocker" ? "destructive" : "outline"} className="text-[10px]">
                  {titleCase(item.status)}
                </Badge>
              </div>
            ))}
            {plan.requiredAccess.map((note) => (
              <div key={note} className="py-1.5 text-xs text-muted-foreground">
                {note}
              </div>
            ))}
          </Section>

          <Section title="Evaluation">
            <ProvenanceRow label="Benchmark" field={spec.evaluation.benchmark} />
            <ProvenanceRow label="Baseline" field={spec.evaluation.baseline} />
            <ProvenanceRow label="Has evaluation plan" field={spec.evaluation.hasEvaluationPlan} />
          </Section>

          <Section title="Deployment">
            <ProvenanceRow label="Output target" field={spec.deployment.outputTarget} />
            <ProvenanceRow label="Serving notes" field={spec.deployment.servingNotes} />
          </Section>

          <Section title="Timeline">
            <ProvenanceRow label="Start date" field={spec.timeline.startDate} />
            <ProvenanceRow label="Deadline" field={spec.timeline.deadline} />
            <ProvenanceRow label="Cadence" field={spec.timeline.cadence} />
          </Section>

          <Section title="Blockers">
            {plan.blockers.map((blocker) => (
              <div key={blocker} className="py-1.5">
                <Badge variant="destructive" className="text-[10px]">
                  Blocker
                </Badge>
                <p className="mt-1 text-xs">{blocker}</p>
              </div>
            ))}
          </Section>

          <Section title="Important Unknowns">
            {spec.unknowns.map((unknown) => (
              <div key={unknown.description} className="py-1.5">
                <p className="text-xs">{unknown.description}</p>
                {unknown.affects && unknown.affects.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {unknown.affects.map((a) => (
                      <Badge key={a} variant="outline" className="text-[10px]">
                        {titleCase(a)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Section>
        </Accordion>
      </div>
    </aside>
  );
}
