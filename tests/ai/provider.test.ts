import { afterEach, describe, expect, it, vi } from "vitest";
import { getChatModel, getStructuredModel } from "@/lib/ai/provider";
import { DEFAULT_TOGETHER_MODEL } from "@/config/model";

describe("provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getChatModel returns a Together model using the default model id", () => {
    vi.stubEnv("TOGETHER_MODEL", "");
    const model = getChatModel();
    expect(model.modelId).toBe(DEFAULT_TOGETHER_MODEL);
    expect(model.provider).toContain("togetherai");
  });

  it("getStructuredModel honors a configured TOGETHER_MODEL override", () => {
    vi.stubEnv("TOGETHER_MODEL", "some-org/some-model");
    const model = getStructuredModel();
    expect(model.modelId).toBe("some-org/some-model");
  });

  it("getChatModel and getStructuredModel use the same model for the MVP", () => {
    vi.stubEnv("TOGETHER_MODEL", "");
    expect(getChatModel().modelId).toBe(getStructuredModel().modelId);
  });
});
