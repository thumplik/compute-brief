export const DEFAULT_TOGETHER_MODEL = "zai-org/GLM-5.3-Flash";

export function getTogetherModelId(): string {
  const configured = process.env.TOGETHER_MODEL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_TOGETHER_MODEL;
}
