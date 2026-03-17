import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "stream";

describe("readStdin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when stdin is a TTY", async () => {
    // Mock stdin.isTTY
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });

    const { readStdin } = await import("../../src/util/stdin.js");
    await expect(readStdin()).rejects.toThrow("--stdin flag used but no data is being piped");

    Object.defineProperty(process.stdin, "isTTY", { value: originalIsTTY, writable: true });
  });
});
