import { describe, expect, it, vi, beforeEach } from "vitest";

const { streamConversationTurn } = vi.hoisted(() => ({ streamConversationTurn: vi.fn() }));

vi.mock("@/lib/ai/conversation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/conversation")>("@/lib/ai/conversation");
  return { ...actual, streamConversationTurn };
});

import { POST } from "@/app/api/chat/route";
import { TurnGenerationError } from "@/lib/ai/conversation";
import { emptyWorkloadSpec } from "@/lib/schema/workload-spec";
import { userProvided } from "@/lib/schema/provenance";
import { readNdjsonStream } from "@/lib/ndjson";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readNdjson(response: Response): Promise<Array<Record<string, unknown>>> {
  const events: Array<Record<string, unknown>> = [];
  await readNdjsonStream(response.body!, (e) => events.push(e as Record<string, unknown>));
  return events;
}

/** Simulates streamConversationTurn: emits deltas that spell out assistantMessage, then resolves. */
function implementStreamingTurn(turn: {
  assistantMessage: string;
  specPatch: unknown;
  nextQuestion: string | null;
  readiness: string;
}) {
  return async ({ onDelta }: { onDelta: (text: string) => void }) => {
    onDelta(turn.assistantMessage);
    return turn;
  };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    streamConversationTurn.mockReset();
  });

  it("streams the assistant message as deltas and ends with a final event carrying the merged spec", async () => {
    streamConversationTurn.mockImplementation(
      implementStreamingTurn({
        assistantMessage: "Got it.",
        specPatch: { requester: { organization: userProvided("Acme Robotics") } },
        nextQuestion: "What does success look like?",
        readiness: "needs_information",
      })
    );

    const response = await POST(
      postRequest({
        messages: [{ role: "user", content: "We work at Acme Robotics." }],
        spec: emptyWorkloadSpec(),
      })
    );

    expect(response.status).toBe(200);
    const events = await readNdjson(response);
    const deltas = events.filter((e) => e.type === "delta").map((e) => e.text).join("");
    expect(deltas).toBe("Got it.");
    const final = events.find((e) => e.type === "final") as { nextQuestion: string; spec: { requester: { organization: { value: string } }; readiness: string } };
    expect(final.nextQuestion).toBe("What does success look like?");
    expect(final.spec.requester.organization.value).toBe("Acme Robotics");
    expect(final.spec.readiness).toBe("needs_information");
  });

  it("defaults to an empty spec when none is provided", async () => {
    streamConversationTurn.mockImplementation(
      implementStreamingTurn({
        assistantMessage: "Tell me more.",
        specPatch: {},
        nextQuestion: "What are you trying to build?",
        readiness: "early_idea",
      })
    );

    const response = await POST(postRequest({ messages: [{ role: "user", content: "Hi" }] }));
    await readNdjson(response);

    expect(response.status).toBe(200);
    expect(streamConversationTurn).toHaveBeenCalledWith(
      expect.objectContaining({ spec: emptyWorkloadSpec() })
    );
  });

  it("rejects an invalid JSON body", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects a request missing messages", async () => {
    const response = await POST(postRequest({ spec: emptyWorkloadSpec() }));
    expect(response.status).toBe(400);
  });

  it("rejects an oversized message list", async () => {
    const messages = Array.from({ length: 201 }, () => ({ role: "user" as const, content: "hi" }));
    const response = await POST(postRequest({ messages }));
    expect(response.status).toBe(400);
  });

  it("emits a readable error event when generation fails (status is already 200, the stream was already open)", async () => {
    streamConversationTurn.mockRejectedValue(new TurnGenerationError());

    const response = await POST(postRequest({ messages: [{ role: "user", content: "Hi" }] }));

    expect(response.status).toBe(200);
    const events = await readNdjson(response);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error" });
    expect((events[0].message as string)).toMatch(/try again/i);
  });

  it("keeps the prior spec and still returns the assistant message when the model's patch doesn't fit the schema", async () => {
    const priorSpec = { ...emptyWorkloadSpec(), requester: { organization: userProvided("Acme Robotics") } };
    streamConversationTurn.mockImplementation(
      implementStreamingTurn({
        assistantMessage: "Noted.",
        // classification must be an array of a closed enum — this value doesn't fit,
        // simulating the model drifting from the schema since structured outputs
        // aren't enforced by the provider.
        specPatch: { classification: { value: "definitely-not-a-real-classification", source: "ai_inferred" } },
        nextQuestion: "What format is the data in?",
        readiness: "needs_information",
      })
    );

    const response = await POST(postRequest({ messages: [{ role: "user", content: "..." }], spec: priorSpec }));
    const events = await readNdjson(response);

    expect(response.status).toBe(200);
    const deltas = events.filter((e) => e.type === "delta").map((e) => e.text).join("");
    expect(deltas).toBe("Noted.");
    const final = events.find((e) => e.type === "final") as { spec: { requester: { organization: { value: string } }; readiness: string } };
    expect(final.spec.requester.organization.value).toBe("Acme Robotics");
    expect(final.spec.readiness).toBe("needs_information");
  });
});
