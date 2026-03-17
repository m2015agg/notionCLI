import { APIResponseError, isNotionClientError } from "@notionhq/client";
import type { Command } from "commander";
import { isJsonMode, outputError } from "./output.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionFn = (...args: any[]) => Promise<void>;

export function withErrorHandling(fn: ActionFn): ActionFn {
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (err) {
      // Find the Command object (last arg before options in commander actions)
      const cmd = args.find(
        (a) => a && typeof a === "object" && "optsWithGlobals" in a,
      ) as Command | undefined;
      const json = cmd ? isJsonMode(cmd) : true;

      if (err instanceof APIResponseError) {
        outputError(
          {
            code: err.code,
            message: err.message,
            status: err.status,
          },
          json,
        );
      } else if (err instanceof SyntaxError) {
        outputError(
          {
            code: "invalid_input",
            message: err.message,
          },
          json,
        );
      } else if (isNotionClientError(err)) {
        outputError(
          {
            code: "notion_client_error",
            message: err.message,
          },
          json,
        );
      } else {
        outputError(
          {
            code: "unexpected",
            message: (err instanceof Error ? err.message : String(err)).slice(0, 500),
          },
          json,
        );
      }
      process.exit(1);
    }
  };
}
