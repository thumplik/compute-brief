import { NextResponse } from "next/server";
import { z } from "zod";
import { WorkloadSpecSchema, emptyWorkloadSpec, type WorkloadSpecPatch } from "@/lib/schema/workload-spec";
import { mergeSpecPatch } from "@/lib/state/merge-patch";
import { runConversationTurn, TurnGenerationError } from "@/lib/ai/conversation";

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      })
    )
    .max(200),
  spec: z.unknown().optional(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedRequest = ChatRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const specResult = WorkloadSpecSchema.safeParse(parsedRequest.data.spec ?? {});
  const spec = specResult.success ? specResult.data : emptyWorkloadSpec();

  try {
    const turn = await runConversationTurn({ history: parsedRequest.data.messages, spec });

    // The model's specPatch isn't constrained by a strict JSON schema at the
    // API level (Together doesn't support structured outputs for this
    // model), so an occasional patch can drift from WorkloadSpecSchema. That
    // should degrade to "keep the prior spec for this turn," not break the
    // whole exchange — the assistant's message and next question are still
    // valid and worth returning.
    let updatedSpec = spec;
    try {
      const merged = mergeSpecPatch(spec, turn.specPatch as WorkloadSpecPatch);
      updatedSpec = WorkloadSpecSchema.parse({ ...merged, readiness: turn.readiness });
    } catch (mergeError) {
      console.error("ComputeBrief: dropping an unmergeable specPatch for this turn.", mergeError);
      updatedSpec = WorkloadSpecSchema.parse({ ...spec, readiness: turn.readiness });
    }

    return NextResponse.json({
      assistantMessage: turn.assistantMessage,
      nextQuestion: turn.nextQuestion,
      spec: updatedSpec,
    });
  } catch (error) {
    if (error instanceof TurnGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
