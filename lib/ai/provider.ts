import { togetherai } from "@ai-sdk/togetherai";
import type { LanguageModel } from "ai";
import { getTogetherModelId } from "@/config/model";

/**
 * Both functions return the same Together model for the MVP (per design:
 * one Together model handles conversation, extraction, planning support,
 * and narrative generation). Kept as two functions so call sites express
 * intent, and so a future model swap for one use case doesn't touch the
 * other.
 */
export function getChatModel(): LanguageModel {
  return togetherai(getTogetherModelId());
}

export function getStructuredModel(): LanguageModel {
  return togetherai(getTogetherModelId());
}
