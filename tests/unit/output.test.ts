import { describe, it, expect, vi, beforeEach } from "vitest";
import { outputSuccess, outputError } from "../../src/output.js";

describe("outputSuccess", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs JSON when json=true", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    outputSuccess({ foo: "bar" }, true);
    const output = writeSpy.mock.calls[0][0] as string;
    expect(JSON.parse(output)).toEqual({ foo: "bar" });
  });

  it("outputs formatted JSON with indentation", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    outputSuccess({ a: 1 }, true);
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("\n");
    expect(output).toContain("  ");
  });

  it("outputs human-readable for page objects when json=false", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    outputSuccess({ object: "page", id: "abc", url: "https://notion.so/abc" }, false);
    const output = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Page: abc");
    expect(output).toContain("https://notion.so/abc");
  });
});

describe("outputError", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs JSON error to stderr when json=true", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    outputError({ code: "not_found", message: "Not found", status: 404 }, true);
    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.error.code).toBe("not_found");
    expect(parsed.error.status).toBe(404);
  });

  it("outputs human-readable error to stderr when json=false", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    outputError({ code: "not_found", message: "Not found", status: 404 }, false);
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("Error [not_found]");
    expect(output).toContain("(404)");
  });

  it("omits status when not provided", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    outputError({ code: "missing_env", message: "No key" }, false);
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).not.toContain("(");
    expect(output).toContain("Error [missing_env]: No key");
  });
});
