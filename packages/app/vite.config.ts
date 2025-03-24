import { defineConfig } from "vite";
import intwc from "@pistonite/vite-plugin-intwc";
import monodev from "mono-dev/vite";

const monodevConfig = monodev({
    wasm: true,
    worker: "es",
});

// https://vite.dev/config/
export default defineConfig(() => {
    return monodevConfig({
        plugins: [intwc({ basicLanguages: ["typescript"], typescript: true })],
    });
});
