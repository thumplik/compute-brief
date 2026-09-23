import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  provenance,
  userProvided,
  aiInferred,
  unknownField,
} from "@/lib/schema/provenance";

describe("provenance", () => {
  const StringProvenance = provenance(z.string());

  it("accepts a user-provided value with no confidence required", () => {
    const parsed = StringProvenance.parse(userProvided("Acme Corp"));
    expect(parsed).toEqual({ value: "Acme Corp", source: "user_provided" });
  });

  it("accepts an ai-inferred value with confidence and reason", () => {
    const parsed = StringProvenance.parse(
      aiInferred(
        "fine-tuning",
        "medium",
        "Existing checkpoint plus new labeled data suggests fine-tuning.",
        ["base model is compatible"]
      )
    );
    expect(parsed.source).toBe("ai_inferred");
    expect(parsed.confidence).toBe("medium");
    expect(parsed.assumptions).toEqual(["base model is compatible"]);
  });

  it("accepts an explicit unknown with a null value", () => {
    const parsed = StringProvenance.parse(unknownField());
    expect(parsed).toEqual({ value: null, source: "unknown" });
  });

  it("rejects a source outside the enum", () => {
    expect(() => StringProvenance.parse({ value: "x", source: "guessed" })).toThrow();
  });
});
