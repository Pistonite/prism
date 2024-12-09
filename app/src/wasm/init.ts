import { PrismApiClient } from "./sides/app.ts";
import PrismWorker from "./worker.ts?worker";

export async function initPrismApi(): Promise<PrismApiClient> {
    const worker = new PrismWorker();
    const api = new PrismApiClient({ worker });
    await api.handshake().established();
    return api;
}
