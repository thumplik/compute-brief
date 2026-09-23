"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyWorkloadSpec, type WorkloadSpec } from "@/lib/schema/workload-spec";
import type { ComputePlan } from "@/lib/schema/compute-plan";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PersistedState {
  messages: ChatMessage[];
  spec: WorkloadSpec;
  narrative: string | null;
  plan: ComputePlan | null;
}

interface WorkloadContextValue extends PersistedState {
  isSendingMessage: boolean;
  isGeneratingBrief: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  generateBrief: () => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = "computebrief:v1";

const WorkloadContext = createContext<WorkloadContextValue | null>(null);

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing, quota exceeded, or storage disabled — non-fatal.
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(typeof json.error === "string" ? json.error : "Something went wrong. Please try again.");
  }
  return json as T;
}

export function WorkloadProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [spec, setSpec] = useState<WorkloadSpec>(emptyWorkloadSpec());
  const [narrative, setNarrative] = useState<string | null>(null);
  const [plan, setPlan] = useState<ComputePlan | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // sessionStorage doesn't exist during SSR; hydrating here (rather than in
    // useState's initializer) is what keeps the first client render matching
    // the server-rendered markup instead of mismatching on it.
    /* eslint-disable react-hooks/set-state-in-effect */
    const persisted = loadPersisted();
    if (persisted) {
      setMessages(persisted.messages);
      setSpec(persisted.spec);
      setNarrative(persisted.narrative);
      setPlan(persisted.plan);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePersisted({ messages, spec, narrative, plan });
  }, [hydrated, messages, spec, narrative, plan]);

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
      setMessages(nextMessages);
      setIsSendingMessage(true);
      try {
        const result = await postJson<{ assistantMessage: string; nextQuestion: string | null; spec: WorkloadSpec }>(
          "/api/chat",
          { messages: nextMessages, spec }
        );
        setSpec(result.spec);
        setMessages([...nextMessages, { role: "assistant", content: result.assistantMessage }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setIsSendingMessage(false);
      }
    },
    [messages, spec]
  );

  const generateBrief = useCallback(async () => {
    setError(null);
    setIsGeneratingBrief(true);
    try {
      const result = await postJson<{ narrative: string; plan: ComputePlan }>("/api/narrative", { spec });
      setNarrative(result.narrative);
      setPlan(result.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [spec]);

  const reset = useCallback(() => {
    setMessages([]);
    setSpec(emptyWorkloadSpec());
    setNarrative(null);
    setPlan(null);
    setError(null);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal.
    }
  }, []);

  const value = useMemo<WorkloadContextValue>(
    () => ({
      messages,
      spec,
      narrative,
      plan,
      isSendingMessage,
      isGeneratingBrief,
      error,
      sendMessage,
      generateBrief,
      reset,
    }),
    [messages, spec, narrative, plan, isSendingMessage, isGeneratingBrief, error, sendMessage, generateBrief, reset]
  );

  return <WorkloadContext.Provider value={value}>{children}</WorkloadContext.Provider>;
}

export function useWorkload(): WorkloadContextValue {
  const ctx = useContext(WorkloadContext);
  if (!ctx) {
    throw new Error("useWorkload must be used within a WorkloadProvider");
  }
  return ctx;
}
