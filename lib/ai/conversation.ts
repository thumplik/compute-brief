import { generateObject, generateText, type ModelMessage } from "ai";
import { getChatModel, getStructuredModel } from "@/lib/ai/provider";
import { CONVERSATION_SYSTEM_PROMPT } from "@/lib/ai/prompts/system";
import { NARRATIVE_SYSTEM_PROMPT } from "@/lib/ai/prompts/narrative";
import { TurnResultSchema, type TurnResult } from "@/lib/schema/conversation-turn";
import type { WorkloadSpec } from "@/lib/schema/workload-spec";
import type { ComputePlan } from "@/lib/schema/compute-plan";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

type GenerateObjectFn = typeof generateObject;
type GenerateTextFn = typeof generateText;

export class TurnGenerationError extends Error {
  constructor(message = "ComputeBrief couldn't understand the model's response. Please try again.") {
    super(message);
    this.name = "TurnGenerationError";
  }
}

export class NarrativeGenerationError extends Error {
  constructor(message = "ComputeBrief couldn't generate the workload brief. Please try again.") {
    super(message);
    this.name = "NarrativeGenerationError";
  }
}

export interface RunConversationTurnOptions {
  history: ConversationMessage[];
  spec: WorkloadSpec;
  generateObjectFn?: GenerateObjectFn;
}

function buildTurnInstructions(spec: WorkloadSpec): string {
  return `${CONVERSATION_SYSTEM_PROMPT}\n\nCurrent WorkloadSpec state (JSON, source of truth so far — patch only what changes):\n${JSON.stringify(spec)}`;
}

export async function runConversationTurn({
  history,
  spec,
  generateObjectFn = generateObject,
}: RunConversationTurnOptions): Promise<TurnResult> {
  const messages: ModelMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
  const instructions = buildTurnInstructions(spec);
  const call = () =>
    generateObjectFn({
      model: getStructuredModel(),
      schema: TurnResultSchema,
      instructions,
      messages,
    });

  try {
    const result = await call();
    return result.object as TurnResult;
  } catch {
    try {
      const result = await call();
      return result.object as TurnResult;
    } catch {
      throw new TurnGenerationError();
    }
  }
}

export interface RunNarrativeGenerationOptions {
  spec: WorkloadSpec;
  plan: ComputePlan;
  generateTextFn?: GenerateTextFn;
}

export async function runNarrativeGeneration({
  spec,
  plan,
  generateTextFn = generateText,
}: RunNarrativeGenerationOptions): Promise<string> {
  const messages: ModelMessage[] = [
    {
      role: "user",
      content: `WorkloadSpec (JSON):\n${JSON.stringify(spec)}\n\nComputePlan (JSON):\n${JSON.stringify(plan)}\n\nWrite the Workload Brief now.`,
    },
  ];

  try {
    const result = await generateTextFn({
      model: getChatModel(),
      instructions: NARRATIVE_SYSTEM_PROMPT,
      messages,
    });
    return result.text;
  } catch {
    throw new NarrativeGenerationError();
  }
}
