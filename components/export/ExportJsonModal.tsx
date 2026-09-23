"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toCanonicalJSON } from "@/lib/export/canonical-json";
import { toServiceNowPayload } from "@/lib/export/servicenow";
import type { WorkloadSpec } from "@/lib/schema/workload-spec";
import type { ComputePlan } from "@/lib/schema/compute-plan";

const SECTIONS = [
  "request",
  "workload",
  "data",
  "model",
  "compute",
  "storage",
  "networking",
  "software",
  "access",
  "evaluation",
  "deployment",
  "schedule",
  "assumptions",
  "unknowns",
  "blockers",
  "recommendedNextSteps",
  "narrative",
];

export function ExportJsonModal({
  spec,
  plan,
  narrative,
}: {
  spec: WorkloadSpec;
  plan: ComputePlan;
  narrative: string;
}) {
  const [copied, setCopied] = useState(false);

  const payload = useMemo(
    () => toServiceNowPayload(toCanonicalJSON(spec, plan, narrative)),
    [spec, plan, narrative]
  );
  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  function handleDownload() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "compute-brief-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Export JSON for ServiceNow
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ComputeBrief JSON Export</DialogTitle>
          <DialogDescription>
            Schema {payload.schema} v{payload.schemaVersion} &middot; generated {payload.generatedAt}
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Sections: {SECTIONS.join(", ")}
        </p>
        <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">{json}</pre>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "Copied" : "Copy JSON"}
          </Button>
          <Button size="sm" onClick={handleDownload}>
            Download JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
