import { wxWorker } from "@pistonite/workex";

import { bindPrismApi, type PrismApi } from "prism-wasm";

import PrismWorker from "./main.ts?worker";

export async function initPrismApi(): Promise<PrismApi> {
    const worker = new PrismWorker();
    const result = await wxWorker(worker)({
        api: bindPrismApi(),
    });
    if (result.err) {
        throw new Error("Failed to bind PrismApi");
    }

    return result.val.protocols.api;
}
