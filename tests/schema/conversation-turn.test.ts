import { describe, expect, it } from "vitest";
import { TurnResultSchema } from "@/lib/schema/conversation-turn";

describe("TurnResultSchema", () => {
  it("parses a well-formed turn result", () => {
    const result = TurnResultSchema.parse({
      assistantMessage: "That helps. It sounds like you already have a working prototype.",
      specPatch: { requester: { organization: { value: "Acme Robotics", source: "user_provided" } } },
      nextQuestion: "Approximately how large is the training dataset?",
      readiness: "needs_information",
    });
    expect(result.nextQuestion).toContain("dataset");
  });

  it("allows a null nextQuestion when no more questions are needed", () => {
    const result = TurnResultSchema.parse({
      assistantMessage: "This looks ready for a compute review.",
      specPatch: {},
      nextQuestion: null,
      readiness: "ready_for_compute_review",
    });
    expect(result.nextQuestion).toBeNull();
  });

  it("rejects a missing assistantMessage", () => {
    expect(() =>
      TurnResultSchema.parse({ specPatch: {}, nextQuestion: null, readiness: "early_idea" })
    ).toThrow();
  });

  it("rejects an invalid readiness value", () => {
    expect(() =>
      TurnResultSchema.parse({
        assistantMessage: "ok",
        specPatch: {},
        nextQuestion: null,
        readiness: "kind_of_ready",
      })
    ).toThrow();
  });
});
