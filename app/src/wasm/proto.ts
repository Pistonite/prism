import { SvgResult } from "wasm/lib";
import { WorkexPromise as Promise } from "./workex";

/**
 * Prism WASM API
 *
 * @workex:send app
 * @workex:recv worker
 */
export interface PrismApi {
    /** Signal that the worker is ready */
    makeSvg(script: string, forceSquare: boolean): Promise<SvgResult>;
}
