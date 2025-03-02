import { hostFromDelegate, type Delegate } from "@pistonite/workex";

import { run_prism_script, type PrismOutput } from "./pkg/prism_wasm.js";
import { bindPrismApiHost } from "./sides/worker.ts";
import type { PrismApi } from "./proto.ts";

export async function bootPrismWasmWorker() {
    const handler = {
        async runScript(script, forceSquare): Promise<PrismOutput> {
            return run_prism_script(script, forceSquare);
        },
    } satisfies Delegate<PrismApi>;

    // Now we bind the handler to the worker
    const handshake = bindPrismApiHost(hostFromDelegate(handler), {
        worker: self,
    });

    await handshake.initiate();
}
