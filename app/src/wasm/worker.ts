import initSwc, { transformSync } from "@swc/wasm-web";
import swcWasmUrl from "@swc/wasm-web/wasm_bg.wasm?url";

import { run_prism_script, PrismOutput } from "./lib";
import { hostFromDelegate, type Delegate } from "./workex";
import { bindPrismApiHost } from "./sides/worker.ts";
import type { PrismApi } from "./proto.ts";

async function boot() {
    await initSwc({
        module_or_path: swcWasmUrl,
    });
    const handler = {
        async runScript(script, forceSquare): Promise<PrismOutput> {
            let code: string;
            try {
                code = transformSync(script, {
                    isModule: false,
                    filename: "main.ts",
                }).code;
            } catch (e) {
                console.error(e);
                // no way to get structured error for now
                // and the text errors are too noisy
                throw new Error("Transpile error");
            }
            return run_prism_script(code, forceSquare);
        },
    } satisfies Delegate<PrismApi>;

    // Now we bind the handler to the worker
    const handshake = bindPrismApiHost(hostFromDelegate(handler), {
        worker: self,
    });

    await handshake.initiate();
}
boot();
