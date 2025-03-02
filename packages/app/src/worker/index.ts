import { PrismApiClient } from "prism-wasm/app";
import PrismWorker from "./main.ts?worker";

export async function initPrismApi(): Promise<PrismApiClient> {
    const worker = new PrismWorker();
    const api = new PrismApiClient({ worker });
    await api.handshake().established();
    return api;
}
