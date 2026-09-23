import { describe, expect, it } from "vitest";
import { CONVERSATION_SYSTEM_PROMPT } from "@/lib/ai/prompts/system";
import { NARRATIVE_SYSTEM_PROMPT } from "@/lib/ai/prompts/narrative";
import { WorkloadClassificationSchema, DataReadinessFlagSchema } from "@/lib/schema/workload-spec";
import { ReadinessSchema } from "@/lib/schema/shared";

describe("CONVERSATION_SYSTEM_PROMPT", () => {
  it("is non-empty and states the facts-vs-inference rule", () => {
    expect(CONVERSATION_SYSTEM_PROMPT.length).toBeGreaterThan(200);
    expect(CONVERSATION_SYSTEM_PROMPT).toMatch(/user_provided/);
    expect(CONVERSATION_SYSTEM_PROMPT).toMatch(/ai_inferred/);
    expect(CONVERSATION_SYSTEM_PROMPT).toMatch(/unknown/);
  });

  it("instructs the model not to ask about GPU count directly", () => {
    expect(CONVERSATION_SYSTEM_PROMPT.toLowerCase()).toMatch(/how many gpus/);
  });

  it("tells the model it is willing to conclude training is unnecessary", () => {
    expect(CONVERSATION_SYSTEM_PROMPT.toLowerCase()).toMatch(/retrieval-augmented generation|rag/);
  });

  it("includes every workload classification value so the model has a closed vocabulary", () => {
    for (const value of WorkloadClassificationSchema.options) {
      expect(CONVERSATION_SYSTEM_PROMPT).toContain(value);
    }
  });

  it("includes every data readiness flag value", () => {
    for (const value of DataReadinessFlagSchema.options) {
      expect(CONVERSATION_SYSTEM_PROMPT).toContain(value);
    }
  });

  it("includes every readiness value", () => {
    for (const value of ReadinessSchema.options) {
      expect(CONVERSATION_SYSTEM_PROMPT).toContain(value);
    }
  });
});

describe("NARRATIVE_SYSTEM_PROMPT", () => {
  it("is non-empty and instructs synthesis rather than a field dump", () => {
    expect(NARRATIVE_SYSTEM_PROMPT.length).toBeGreaterThan(200);
    expect(NARRATIVE_SYSTEM_PROMPT.toLowerCase()).toMatch(/synthesiz/);
  });

  it("lists the required narrative sections", () => {
    for (const section of [
      "Current state",
      "Proposed technical approach",
      "Compute recommendation",
      "Assumptions",
      "Open questions",
      "Blockers",
      "Recommended next steps",
    ]) {
      expect(NARRATIVE_SYSTEM_PROMPT).toContain(section);
    }
  });
});
