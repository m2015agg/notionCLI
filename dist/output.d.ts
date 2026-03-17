import type { Command } from "commander";
export declare function isJsonMode(cmd: Command): boolean;
export declare function outputSuccess(data: unknown, json: boolean): void;
export declare function outputError(error: {
    code: string;
    message: string;
    status?: number;
}, json: boolean): void;
