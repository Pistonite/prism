import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import wasm from "vite-plugin-wasm";
import yaml from "@modyfi/vite-plugin-yaml";
import topLevelAwait from "vite-plugin-top-level-await";

const kebabCase = (x: string) =>
    x.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

// https://vite.dev/config/
export default defineConfig(() => {
    const createPlugins = (isWorker: boolean) => {
        const plugins = [tsConfigPaths(), wasm()];

        if (isWorker) {
            plugins.push(topLevelAwait());
        } else {
            plugins.push(react(), yaml());
        }

        return plugins;
    };
    return {
        // still put cache there with deno
        cacheDir: "node_modules/.vite",
        plugins: createPlugins(false),
        worker: {
            plugins: () => {
                return createPlugins(true);
            },
        },
        resolve: {
            dedupe: ["@pistonite/pure"],
        },
        build: {
            rollupOptions: {
                output: {
                    chunkFileNames: (info) => {
                        for (let i = 0; i < info.moduleIds.length; i++) {
                            if (
                                info.moduleIds[i].includes("vs/basic-languages")
                            ) {
                                return `assets/monaco-editor/basic-languages/${info.name}-[hash].js`;
                            }
                            if (info.moduleIds[i].includes("vs/language")) {
                                return `assets/monaco-editor/language/${info.name}-[hash].js`;
                            }
                        }
                        const name = kebabCase(info.name);
                        return `${name}-[hash].js`;
                    },
                },
            },
        },
    };
});
