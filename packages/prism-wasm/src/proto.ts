import type { WxPromise } from "@pistonite/workex";

import type { PrismOutput } from "./pkg/prism_wasm";

/**
 * Prism WASM API
 */
export interface PrismApi {
    /** run rendering script */
    runScript(script: string, forceSquare: boolean): WxPromise<PrismOutput>;
}
