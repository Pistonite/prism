console.log("initializing worker");

import { run_prism_script, PrismOutput } from "./lib";
import { hostFromDelegate, type Delegate } from "./workex";
import { bindPrismApiHost } from "./sides/worker.ts";
import type { PrismApi } from "./proto.ts";

const handler = {
    async runScript(script, forceSquare): Promise<PrismOutput> {
        return run_prism_script(script, forceSquare);
    },
} satisfies Delegate<PrismApi>;

// Now we bind the handler to the worker
const handshake = bindPrismApiHost(hostFromDelegate(handler), { worker: self });
void handshake.initiate();
