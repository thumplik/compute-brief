import { describe, expect, it } from "vitest";
import { narrativeToMarkdownFile } from "@/lib/export/markdown";

describe("narrativeToMarkdownFile", () => {
  it("wraps the narrative with a title and generated timestamp comment", () => {
    const md = narrativeToMarkdownFile("Body text.", "Acme Robotics — Ship Detection");
    expect(md).toContain("# Acme Robotics — Ship Detection");
    expect(md).toContain("Body text.");
  });

  it("falls back to a generic title when none is given", () => {
    const md = narrativeToMarkdownFile("Body text.");
    expect(md).toContain("# ComputeBrief Workload Brief");
  });
});
