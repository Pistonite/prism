import { Result } from "@pistonite/pure/result";

/**
 * Latest is a synchronization utility to allow
 * only one async operation to be executed at a time,
 * and any call will only return the result of the latest
 * operation.
 */
export class Latest<TResult> {
    private isRunning = false;
    private pending: {
        resolve: (result: TResult) => void;
        reject: (error: unknown) => void;
    }[] = [];

    constructor(private fn: () => Promise<TResult>) {}

    public async execute(): Promise<TResult> {
        if (this.isRunning) {
            return new Promise<TResult>((resolve, reject) => {
                this.pending.push({ resolve, reject });
            });
        }
        this.isRunning = true;
        const alreadyPending = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: Result<TResult, unknown> = { err: "not executed" };
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const fn = this.fn;
                result = { val: await fn() };
            } catch (error) {
                result = { err: error };
            }
            if (this.pending.length) {
                alreadyPending.push(...this.pending);
                this.pending = [];
                continue;
            }
            break;
        }
        this.isRunning = false;
        if ("err" in result) {
            alreadyPending.forEach(({ reject }) => reject(result.err));
            throw result.err;
        } else {
            alreadyPending.forEach(({ resolve }) => resolve(result.val));
            return result.val;
        }
    }
}
