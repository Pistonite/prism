console.log("initializing worker");

import { make_svg, SvgResult } from "./lib";
import { hostFromDelegate, type Delegate } from "./workex";
import { bindPrismApiHost } from "./sides/worker.ts";
import type { PrismApi } from "./proto.ts";

const handler = {
    async makeSvg(script, forceSquare): Promise<SvgResult> {
        return make_svg(script, forceSquare);
    },
} satisfies Delegate<PrismApi>;

// Now we bind the handler to the worker
const handshake = bindPrismApiHost(hostFromDelegate(handler), { worker: self });
void handshake.initiate();
