import { getModel } from "@earendil-works/pi-ai";

export const DEFAULT_MODEL = getModel("deepseek", "deepseek-v4-pro");

export function getModelByProvider(provider: string, modelId: string) {
  return getModel(provider as never, modelId as never);
}
