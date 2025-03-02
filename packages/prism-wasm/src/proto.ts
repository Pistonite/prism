import type { WorkexPromise as Promise } from "@pistonite/workex";

import type { PrismOutput } from "./pkg/prism_wasm";

/**
 * Prism WASM API
 *
 * @workex:send app
 * @workex:recv worker
 */
export interface PrismApi {
    /** run rendering script */
    runScript(script: string, forceSquare: boolean): Promise<PrismOutput>;
}
