"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWorkload } from "@/lib/state/workload-context";

export function Header() {
  const { messages, reset } = useWorkload();
  const router = useRouter();

  function handleReset() {
    if (messages.length === 0 || window.confirm("Start a new intake? This clears the current conversation.")) {
      reset();
      router.push("/");
    }
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div>
        <h1 className="text-base font-semibold">ComputeBrief</h1>
        <p className="text-xs text-muted-foreground">
          Describe what you want to build. We&apos;ll figure out what it takes.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleReset}>
        Start New Intake
      </Button>
    </header>
  );
}
