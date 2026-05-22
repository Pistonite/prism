import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initDark } from "@pistonite/celera";

import { initStore } from "#store";
import { initI18n } from "#i18n";
import { initPrismApi } from "#worker";

import { App } from "./app.tsx";

async function boot() {
    initDark();

    await initI18n();

    const root = document.getElementById("-reactroot-");
    if (!root) {
        throw new Error("react root element not found");
    }

    createRoot(root).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
    const api = await initPrismApi();
    initStore(api);
}

void boot();
