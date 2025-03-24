import { wxWrapHandler, wxWorkerGlobal } from "@pistonite/workex";

import { run_prism_script, type PrismOutput } from "./pkg/prism_wasm.js";

import type { PrismApi } from "./proto.ts";
import { bindPrismApi } from "./interfaces/PrismApi.bus.ts";

export async function bootPrismWasmWorker() {
    const handler: PrismApi = {
        runScript: wxWrapHandler((script, forceSquare): PrismOutput => {
            return run_prism_script(script, forceSquare);
        }),
    };

    const result = await wxWorkerGlobal()({
        app: bindPrismApi(handler),
    });

    if (result.err) {
        console.error(result.err);
        throw new Error("Failed to bind PrismApi");
    }
}
