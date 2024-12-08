/**
 * Debounce executes an action after a certain delay. Any
 * call to the action during this delay resets the timer.
 */
export class Debounce<TResult> {
    private timer: number | undefined;
    constructor(
        private fn: () => Promise<TResult>,
        private delay: number,
    ) {
        this.timer = undefined;
    }

    public execute(): Promise<TResult> {
        if (this.timer !== undefined) {
            clearTimeout(this.timer);
        }
        return new Promise<TResult>((resolve, reject) => {
            this.timer = setTimeout(async () => {
                this.timer = undefined;
                try {
                    resolve(await this.fn());
                } catch (error) {
                    reject(error);
                }
            }, this.delay);
        });
    }
}
