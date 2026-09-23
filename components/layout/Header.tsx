"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useWorkload } from "@/lib/state/workload-context";

export function Header({
  briefOpen,
  onToggleBrief,
}: {
  briefOpen?: boolean;
  onToggleBrief?: () => void;
}) {
  const { messages, reset } = useWorkload();
  const router = useRouter();

  function handleReset() {
    if (messages.length === 0 || window.confirm("Start a new intake? This clears the current conversation.")) {
      reset();
      router.push("/");
    }
  }

  return (
    <header className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-base font-semibold">ComputeBrief</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Describe what you want to build. We&apos;ll figure out what it takes.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onToggleBrief && (
          <Button variant="outline" size="sm" onClick={onToggleBrief}>
            {briefOpen ? "Hide Brief" : "Show Brief"}
          </Button>
        )}
        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={handleReset}>
          Start New Intake
        </Button>
      </div>
    </header>
  );
}
