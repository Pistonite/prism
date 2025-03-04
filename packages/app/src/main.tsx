import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initDark } from "@pistonite/pure/pref";
import { initCodeEditor } from "@pistonite/intwc";

import { initStore } from "data/store.ts";
import { initI18n } from "data/i18n.ts";

import { App } from "./App.tsx";
import { initPrismApi } from "./worker";
import PrismLibTs from "./PrismLib.ts?raw";

async function boot() {
    initDark();

    await initI18n();
    initCodeEditor({
        language: {
            typescript: {
                extraLibs: [{ name: "prism-lib.ts", content: PrismLibTs }],
            },
        },
    });

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
