import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initDark } from "@pistonite/pure/pref";
import { App } from "./App.tsx";
import { initPrismApi } from "wasm/init.ts";
import { initEditor } from "data/editor.ts";
import { initStore } from "data/store.ts";
import { initI18n } from "data/i18n.ts";

async function boot() {
    initDark();

    await initI18n();
    await initEditor();

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
