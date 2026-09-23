import { z } from "zod";
import { NextResponse } from "next/server";
import { WorkloadSpecSchema, emptyWorkloadSpec, type WorkloadSpecPatch } from "@/lib/schema/workload-spec";
import { mergeSpecPatch } from "@/lib/state/merge-patch";
import { streamConversationTurn, TurnGenerationError } from "@/lib/ai/conversation";

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: unknown) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      try {
        const turn = await streamConversationTurn({
          history: parsedRequest.data.messages,
          spec,
          onDelta: (text) => send({ type: "delta", text }),
        });

        // The model's specPatch isn't constrained by a strict JSON schema at
        // the API level (Together doesn't support structured outputs for
        // this model), so an occasional patch can drift from
        // WorkloadSpecSchema. That should degrade to "keep the prior spec
        // for this turn," not break the whole exchange — the assistant's
        // message and next question are still valid and worth returning.
        let updatedSpec = spec;
        try {
          const merged = mergeSpecPatch(spec, turn.specPatch as WorkloadSpecPatch);
          updatedSpec = WorkloadSpecSchema.parse({ ...merged, readiness: turn.readiness });
        } catch (mergeError) {
          console.error("ComputeBrief: dropping an unmergeable specPatch for this turn.", mergeError);
          updatedSpec = WorkloadSpecSchema.parse({ ...spec, readiness: turn.readiness });
        }

        send({ type: "final", nextQuestion: turn.nextQuestion, spec: updatedSpec });
      } catch (error) {
        const message =
          error instanceof TurnGenerationError
            ? error.message
            : "Something went wrong. Please try again.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8" },
  });
}
