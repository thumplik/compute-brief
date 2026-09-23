import { describe, expect, it, vi } from "vitest";
import {
  streamConversationTurn,
  runNarrativeGeneration,
  TurnGenerationError,
  NarrativeGenerationError,
} from "@/lib/ai/conversation";
import { emptyWorkloadSpec } from "@/lib/schema/workload-spec";
import { userProvided } from "@/lib/schema/provenance";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { ragDocumentQaSpec } from "../fixtures/workload-specs";

const fixtureTurnResult = {
  assistantMessage: "Got it — that sounds like a retrieval problem over your documents.",
  specPatch: { classification: userProvided(["rag"]) },
  nextQuestion: "Roughly how many documents are we talking about?",
  readiness: "needs_information" as const,
};

function fakeStream(partials: Array<{ assistantMessage?: string }>, final: typeof fixtureTurnResult) {
  return {
    partialObjectStream: (async function* () {
      for (const p of partials) yield p;
    })(),
    object: Promise.resolve(final),
  };
}

function fakeFailingStream(partials: Array<{ assistantMessage?: string }>) {
  const rejected = Promise.reject(new Error("stream broke"));
  rejected.catch(() => {}); // the code under test never awaits this when the generator itself throws first
  return {
    partialObjectStream: (async function* () {
      for (const p of partials) yield p;
      throw new Error("stream broke");
    })(),
    object: rejected,
  };
}

describe("streamConversationTurn", () => {
  it("passes the model, schema, instructions with current spec, and mapped messages", async () => {
    const streamObjectFn = vi.fn().mockReturnValue(
      fakeStream(
        [{ assistantMessage: "Got" }, { assistantMessage: "Got it — that sounds" }],
        fixtureTurnResult
      )
    );
    const spec = { ...emptyWorkloadSpec(), requester: { organization: userProvided("Acme Robotics") } };
    const onDelta = vi.fn();

    const result = await streamConversationTurn({
      history: [{ role: "user", content: "We want to search our internal docs." }],
      spec,
      streamObjectFn,
      onDelta,
    });

    expect(result).toEqual(fixtureTurnResult);
    expect(streamObjectFn).toHaveBeenCalledTimes(1);
    const callArgs = streamObjectFn.mock.calls[0][0];
    expect(callArgs.messages).toEqual([
      { role: "user", content: "We want to search our internal docs." },
    ]);
    expect(callArgs.instructions).toContain("Acme Robotics");
    expect(callArgs.schema).toBeDefined();
    expect(callArgs.model).toBeDefined();
  });

  it("streams only the incremental text delta as the partial object grows", async () => {
    const streamObjectFn = vi.fn().mockReturnValue(
      fakeStream(
        [{ assistantMessage: "Got" }, { assistantMessage: "Got it — that sounds" }],
        fixtureTurnResult
      )
    );
    const onDelta = vi.fn();

    await streamConversationTurn({ history: [], spec: emptyWorkloadSpec(), streamObjectFn, onDelta });

    expect(onDelta.mock.calls.map((c) => c[0])).toEqual([
      "Got",
      " it — that sounds",
      " like a retrieval problem over your documents.",
    ]);
  });

  it("retries once if the stream fails before anything was sent, and succeeds on retry", async () => {
    const streamObjectFn = vi
      .fn()
      .mockReturnValueOnce(fakeFailingStream([]))
      .mockReturnValueOnce(fakeStream([{ assistantMessage: fixtureTurnResult.assistantMessage }], fixtureTurnResult));
    const onDelta = vi.fn();

    const result = await streamConversationTurn({
      history: [],
      spec: emptyWorkloadSpec(),
      streamObjectFn,
      onDelta,
    });

    expect(result).toEqual(fixtureTurnResult);
    expect(streamObjectFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry once content has already been streamed, and throws TurnGenerationError", async () => {
    const streamObjectFn = vi.fn().mockReturnValue(fakeFailingStream([{ assistantMessage: "Partial" }]));
    const onDelta = vi.fn();

    await expect(
      streamConversationTurn({ history: [], spec: emptyWorkloadSpec(), streamObjectFn, onDelta })
    ).rejects.toThrow(TurnGenerationError);
    expect(streamObjectFn).toHaveBeenCalledTimes(1);
    expect(onDelta).toHaveBeenCalledWith("Partial");
  });

  it("throws a readable TurnGenerationError if both attempts fail before sending anything", async () => {
    const streamObjectFn = vi.fn().mockReturnValue(fakeFailingStream([]));
    const onDelta = vi.fn();

    await expect(
      streamConversationTurn({ history: [], spec: emptyWorkloadSpec(), streamObjectFn, onDelta })
    ).rejects.toThrow(TurnGenerationError);
    expect(streamObjectFn).toHaveBeenCalledTimes(2);
  });
});

describe("runNarrativeGeneration", () => {
  it("passes spec and plan JSON to the model and returns the generated text", async () => {
    const spec = ragDocumentQaSpec();
    const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);
    const generateTextFn = vi.fn().mockResolvedValue({ text: "# Workload Brief\n\n..." });

    const narrative = await runNarrativeGeneration({ spec, plan, generateTextFn });

    expect(narrative).toBe("# Workload Brief\n\n...");
    const callArgs = generateTextFn.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("rag");
    expect(callArgs.instructions).toContain("Synthesize");
  });

  it("throws a readable NarrativeGenerationError on failure", async () => {
    const spec = ragDocumentQaSpec();
    const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);
    const generateTextFn = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(runNarrativeGeneration({ spec, plan, generateTextFn })).rejects.toThrow(
      NarrativeGenerationError
    );
  });
});
