import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TOGETHER_MODEL, getTogetherModelId } from "@/config/model";

describe("getTogetherModelId", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the default model when TOGETHER_MODEL is unset", () => {
    vi.stubEnv("TOGETHER_MODEL", "");
    expect(getTogetherModelId()).toBe(DEFAULT_TOGETHER_MODEL);
  });

  it("returns the configured model when TOGETHER_MODEL is set", () => {
    vi.stubEnv("TOGETHER_MODEL", "some-org/some-model");
    expect(getTogetherModelId()).toBe("some-org/some-model");
  });
});
