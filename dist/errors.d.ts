type ActionFn = (...args: any[]) => Promise<void>;
export declare function withErrorHandling(fn: ActionFn): ActionFn;
export {};
