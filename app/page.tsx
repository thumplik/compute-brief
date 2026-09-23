"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { WorkloadBriefPanel } from "@/components/workload/WorkloadBriefPanel";

export default function Home() {
  const [briefOpen, setBriefOpen] = useState(true);

  useEffect(() => {
    // Default to hidden on narrow screens (it would otherwise render as a
    // full-screen overlay on first paint); desktop keeps the two-column
    // layout open by default. This can't be known during SSR, so it's
    // corrected here rather than in useState's initializer.
    const isMobile = !window.matchMedia("(min-width: 768px)").matches;
    if (isMobile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBriefOpen(false);
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header briefOpen={briefOpen} onToggleBrief={() => setBriefOpen((open) => !open)} />
      <div
        className={`grid flex-1 grid-cols-1 overflow-hidden ${
          briefOpen ? "md:grid-cols-[minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_420px]" : ""
        }`}
      >
        <ChatPanel />
        {briefOpen && (
          <div className="fixed inset-0 z-50 md:static md:z-auto">
            <WorkloadBriefPanel onClose={() => setBriefOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
