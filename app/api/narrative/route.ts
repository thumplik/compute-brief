import { NextResponse } from "next/server";
import { z } from "zod";
import { WorkloadSpecSchema } from "@/lib/schema/workload-spec";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { runNarrativeGeneration, NarrativeGenerationError } from "@/lib/ai/conversation";

const NarrativeRequestSchema = z.object({
  spec: z.unknown(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedRequest = NarrativeRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const specResult = WorkloadSpecSchema.safeParse(parsedRequest.data.spec);
  if (!specResult.success) {
    return NextResponse.json({ error: "Invalid workload spec." }, { status: 400 });
  }

  const spec = specResult.data;
  const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);

  try {
    const narrative = await runNarrativeGeneration({ spec, plan });
    return NextResponse.json({ narrative, plan });
  } catch (error) {
    if (error instanceof NarrativeGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
