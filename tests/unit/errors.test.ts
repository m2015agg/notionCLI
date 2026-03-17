import { describe, it, expect, vi, beforeEach } from "vitest";
import { withErrorHandling } from "../../src/errors.js";

describe("withErrorHandling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  it("calls the wrapped function normally on success", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const wrapped = withErrorHandling(fn);
    await wrapped("arg1", "arg2");
    expect(fn).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("catches SyntaxError and outputs invalid_input", async () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const fn = vi.fn().mockRejectedValue(new SyntaxError("bad json"));
    const wrapped = withErrorHandling(fn);
    await wrapped();
    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.error.code).toBe("invalid_input");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("catches generic errors as unexpected", async () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const fn = vi.fn().mockRejectedValue(new Error("something broke"));
    const wrapped = withErrorHandling(fn);
    await wrapped();
    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.error.code).toBe("unexpected");
    expect(parsed.error.message).toBe("something broke");
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
