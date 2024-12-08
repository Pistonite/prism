console.log("initializing worker");

import { make_svg, SvgResult } from "wasm/lib";

import { hostFromDelegate, type Delegate } from "wasm/workex";
import { bindPrismApiHost } from "wasm/sides/worker.ts";
import type { PrismApi } from "wasm/proto.ts";

const handler = {
    async makeSvg(script, forceSquare): Promise<SvgResult> {
        return make_svg(script, forceSquare);
    },
} satisfies Delegate<PrismApi>;

// Now we bind the handler to the worker
const handshake = bindPrismApiHost(hostFromDelegate(handler), { worker: self });
handshake.initiate();
