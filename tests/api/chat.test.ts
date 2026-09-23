import { describe, expect, it, vi, beforeEach } from "vitest";

const { runConversationTurn } = vi.hoisted(() => ({ runConversationTurn: vi.fn() }));

vi.mock("@/lib/ai/conversation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/conversation")>("@/lib/ai/conversation");
  return { ...actual, runConversationTurn };
});

import { POST } from "@/app/api/chat/route";
import { TurnGenerationError } from "@/lib/ai/conversation";
import { emptyWorkloadSpec } from "@/lib/schema/workload-spec";
import { userProvided } from "@/lib/schema/provenance";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    runConversationTurn.mockReset();
  });

  it("merges the returned patch into the spec and returns the updated state", async () => {
    runConversationTurn.mockResolvedValue({
      assistantMessage: "Got it.",
      specPatch: { requester: { organization: userProvided("Acme Robotics") } },
      nextQuestion: "What does success look like?",
      readiness: "needs_information",
    });

    const response = await POST(
      postRequest({
        messages: [{ role: "user", content: "We work at Acme Robotics." }],
        spec: emptyWorkloadSpec(),
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.assistantMessage).toBe("Got it.");
    expect(json.nextQuestion).toBe("What does success look like?");
    expect(json.spec.requester.organization.value).toBe("Acme Robotics");
    expect(json.spec.readiness).toBe("needs_information");
  });

  it("defaults to an empty spec when none is provided", async () => {
    runConversationTurn.mockResolvedValue({
      assistantMessage: "Tell me more.",
      specPatch: {},
      nextQuestion: "What are you trying to build?",
      readiness: "early_idea",
    });

    const response = await POST(postRequest({ messages: [{ role: "user", content: "Hi" }] }));

    expect(response.status).toBe(200);
    expect(runConversationTurn).toHaveBeenCalledWith(
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

  it("returns 502 with a readable message when generation fails twice", async () => {
    runConversationTurn.mockRejectedValue(new TurnGenerationError());

    const response = await POST(postRequest({ messages: [{ role: "user", content: "Hi" }] }));

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toMatch(/try again/i);
  });

  it("keeps the prior spec and still returns the assistant message when the model's patch doesn't fit the schema", async () => {
    const priorSpec = { ...emptyWorkloadSpec(), requester: { organization: userProvided("Acme Robotics") } };
    runConversationTurn.mockResolvedValue({
      assistantMessage: "Noted.",
      // classification must be an array of a closed enum — this value doesn't fit,
      // simulating the model drifting from the schema since structured outputs
      // aren't enforced by the provider.
      specPatch: { classification: { value: "definitely-not-a-real-classification", source: "ai_inferred" } },
      nextQuestion: "What format is the data in?",
      readiness: "needs_information",
    });

    const response = await POST(postRequest({ messages: [{ role: "user", content: "..." }], spec: priorSpec }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.assistantMessage).toBe("Noted.");
    expect(json.spec.requester.organization.value).toBe("Acme Robotics");
    expect(json.spec.readiness).toBe("needs_information");
  });
});
