import { PrismOutput } from "wasm/lib";
import { WorkexPromise as Promise } from "./workex";

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
