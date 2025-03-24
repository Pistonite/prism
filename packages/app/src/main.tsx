import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initDark } from "@pistonite/pure/pref";
import { initCodeEditor } from "@pistonite/intwc";

import { initStore } from "self::store";
import { initI18n } from "self::i18n";
import { initPrismApi } from "self::worker";

import { App } from "./App.tsx";
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
