"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ExportJsonModal } from "@/components/export/ExportJsonModal";
import { useWorkload } from "@/lib/state/workload-context";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { narrativeToMarkdownFile } from "@/lib/export/markdown";
import { copyToClipboard } from "@/lib/clipboard";

export default function BriefPage() {
  const { spec, narrative, isGeneratingBrief, generateBrief, error } = useWorkload();
  const plan = useMemo(() => buildComputePlan(spec, MVP_CLUSTER_PROFILE), [spec]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const title = spec.requester.projectName?.value ?? spec.requester.organization?.value ?? undefined;

  async function handleCopy() {
    if (!narrative) return;
    const ok = await copyToClipboard(narrative);
    setCopyState(ok ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  function handleDownload() {
    if (!narrative) return;
    const markdown = narrativeToMarkdownFile(narrative, title);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "compute-brief-workload-brief.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to conversation
        </Link>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isGeneratingBrief && (
          <p className="mt-8 text-sm text-muted-foreground">Generating your Workload Brief&hellip;</p>
        )}

        {!isGeneratingBrief && !narrative && (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              No Workload Brief has been generated yet for this conversation.
            </p>
            <Button onClick={() => generateBrief()}>Generate Workload Brief</Button>
          </div>
        )}

        {!isGeneratingBrief && narrative && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy Narrative"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                Download Markdown
              </Button>
              <ExportJsonModal spec={spec} plan={plan} narrative={narrative} />
              <Button variant="secondary" size="sm" onClick={() => generateBrief()}>
                Regenerate
              </Button>
            </div>

            <article className="prose prose-sm mt-6 max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{narrative}</ReactMarkdown>
            </article>
          </>
        )}
      </div>
    </div>
  );
}
