import { describe, expect, it } from "vitest";
import { readNdjsonStream } from "@/lib/ndjson";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

describe("readNdjsonStream", () => {
  it("parses complete lines delivered in a single chunk", async () => {
    const events: unknown[] = [];
    await readNdjsonStream(
      streamFromChunks(['{"type":"delta","text":"a"}\n{"type":"delta","text":"b"}\n']),
      (e) => events.push(e)
    );
    expect(events).toEqual([{ type: "delta", text: "a" }, { type: "delta", text: "b" }]);
  });

  it("reassembles a line split across multiple chunks", async () => {
    const events: unknown[] = [];
    await readNdjsonStream(
      streamFromChunks(['{"type":"delta"', ',"text":"hello"}', "\n"]),
      (e) => events.push(e)
    );
    expect(events).toEqual([{ type: "delta", text: "hello" }]);
  });

  it("ignores a trailing partial line with no newline", async () => {
    const events: unknown[] = [];
    await readNdjsonStream(
      streamFromChunks(['{"type":"delta","text":"a"}\n{"type":"final"']),
      (e) => events.push(e)
    );
    expect(events).toEqual([{ type: "delta", text: "a" }]);
  });
});
