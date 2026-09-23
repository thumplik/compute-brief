import { streamObject, generateText, type ModelMessage } from "ai";
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

type StreamObjectFn = typeof streamObject;
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

export interface StreamConversationTurnOptions {
  history: ConversationMessage[];
  spec: WorkloadSpec;
  streamObjectFn?: StreamObjectFn;
  /** Called with each new slice of assistantMessage text as it becomes available. */
  onDelta: (text: string) => void;
}

function buildTurnInstructions(spec: WorkloadSpec): string {
  return `${CONVERSATION_SYSTEM_PROMPT}\n\nCurrent WorkloadSpec state (JSON, source of truth so far — patch only what changes):\n${JSON.stringify(spec)}`;
}

function extractAssistantMessage(partial: unknown): string {
  if (
    typeof partial === "object" &&
    partial !== null &&
    "assistantMessage" in partial &&
    typeof (partial as { assistantMessage: unknown }).assistantMessage === "string"
  ) {
    return (partial as { assistantMessage: string }).assistantMessage;
  }
  return "";
}

/**
 * Marks a failure that happened before any content reached the caller via
 * onDelta — safe to retry silently. Once even one delta has been sent, the
 * caller (the API route) has already streamed that text to the client, so a
 * silent retry would either duplicate or contradict what's on screen; in
 * that case this is *not* thrown and the real error propagates instead.
 */
class RetryableStreamError extends Error {}

export async function streamConversationTurn({
  history,
  spec,
  streamObjectFn = streamObject,
  onDelta,
}: StreamConversationTurnOptions): Promise<TurnResult> {
  const messages: ModelMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
  const instructions = buildTurnInstructions(spec);

  async function attempt(): Promise<TurnResult> {
    let sentAnything = false;
    try {
      const result = streamObjectFn({
        model: getStructuredModel(),
        schema: TurnResultSchema,
        instructions,
        messages,
      });

      let last = "";
      for await (const partial of result.partialObjectStream) {
        const message = extractAssistantMessage(partial);
        if (message.length > last.length) {
          onDelta(message.slice(last.length));
          sentAnything = true;
          last = message;
        }
      }

      const turn = (await result.object) as TurnResult;
      if (turn.assistantMessage.length > last.length) {
        onDelta(turn.assistantMessage.slice(last.length));
      }
      return turn;
    } catch (error) {
      if (sentAnything) throw error;
      throw new RetryableStreamError();
    }
  }

  try {
    return await attempt();
  } catch (error) {
    if (!(error instanceof RetryableStreamError)) {
      throw new TurnGenerationError();
    }
    try {
      return await attempt();
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
