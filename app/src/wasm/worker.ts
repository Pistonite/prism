console.log("initializing worker");

// Vite currently has issues in bundling WASM in workers
// (works with esbuild, but not with rollup)
import "./lib/prism_app_wasm.js";

import { hostFromDelegate, type Delegate } from "./workex";
import { bindPrismApiHost } from "./sides/worker.ts";
import type { PrismApi } from "./proto.ts";

const handler = {
    async makeSvg(script, forceSquare): Promise<wasm_bindgen.SvgResult> {
        return wasm_bindgen.make_svg(script, forceSquare);
    },
} satisfies Delegate<PrismApi>;

// Now we bind the handler to the worker
const handshake = bindPrismApiHost(hostFromDelegate(handler), { worker: self });
void handshake.initiate();
