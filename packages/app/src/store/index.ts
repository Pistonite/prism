import { debounce, latest } from "@pistonite/pure/sync";
import { create } from "zustand";

import type { PrismOutput } from "prism-wasm/lib";
import type { PrismApi } from "prism-wasm";

export type SvgOutput = (PrismOutput & { type: "output" })["data"];

export type Store = {
    output: SvgOutput | undefined;
    scriptError: string;
    script: string;
    forceSquare: boolean;
    showGrid: boolean;
    zoom: number;
    translateX: number;
    translateY: number;
    sideWindowPercentage: number;
    codeWindowPercentage: number;
};

export const useStore = create<Store>()(() => ({
    output: undefined,
    scriptError: "",
    script: "",
    forceSquare: false,
    showGrid: false,
    zoom: 1,
    translateX: 0,
    translateY: 0,
    sideWindowPercentage: 40,
    codeWindowPercentage: 70,
}));

export const setForceSquare = (forceSquare: boolean) => {
    useStore.setState({ forceSquare });
};
export const setScript = (script: string) => {
    useStore.setState({ script });
};
export const setShowGrid = (showGrid: boolean) => {
    useStore.setState({ showGrid });
};
export const setTranslate = (x: number, y: number) => {
    useStore.setState({ translateX: x, translateY: y });
};
export const setZoomAndTranslate = (zoom: number, x: number, y: number) => {
    useStore.setState({ zoom, translateX: x, translateY: y });
};
export const setSideWindowPercentage = (percentage: number) => {
    useStore.setState({ sideWindowPercentage: percentage });
};
export const setCodeWindowPercentage = (percentage: number) => {
    useStore.setState({ codeWindowPercentage: percentage });
};

export const useSvgTransform = () => {
    const svg = useStore((state) => state.output?.svg);
    if (svg) {
        return { unit: svg.unit, shiftX: svg.shift_x, shiftY: svg.shift_y };
    }
    return { unit: 20, shiftX: 0, shiftY: 0 };
};

export const useSvgContent = () => {
    const svg = useStore((state) => state.output?.svg);
    if (svg) {
        return svg.content;
    }
    return "";
};

const STATE_KEY = "Prism.State";
const DEFAULT_SCRIPT = `size(16, 16, 16)
    .at(0, 0, 0)
    .render("red");`;

export function initStore(api: PrismApi): Store {
    const save = debounce({
        fn: () => {
            const { script, showGrid, forceSquare } = useStore.getState();
            localStorage.setItem(
                STATE_KEY,
                JSON.stringify({ script, showGrid, forceSquare }),
            );
        },
        interval: 1000,
    });
    const runScript = latest({
        fn: async () => {
            const { script, forceSquare } = useStore.getState();
            const result = await api.runScript(script, forceSquare);
            if (result.err) {
                useStore.setState({
                    output: undefined,
                    scriptError: result.err.message,
                });
                return;
            }
            if (result.val.type === "transpileError") {
                useStore.setState({
                    output: undefined,
                    scriptError: "Transpile Error",
                });
                return;
            }
            useStore.setState({ output: result.val.data, scriptError: "" });
        },
    });
    useStore.subscribe((curr, prev) => {
        void save();
        if (
            curr.script !== prev.script ||
            curr.forceSquare !== prev.forceSquare
        ) {
            void runScript();
        }
    });

    try {
        const stateJSON = localStorage.getItem(STATE_KEY);
        if (!stateJSON) {
            useStore.setState({ script: DEFAULT_SCRIPT });
        } else {
            const { script, showGrid, forceSquare } = JSON.parse(stateJSON);
            useStore.setState({ script, showGrid, forceSquare });
        }
    } catch (e) {
        console.error(e);
        useStore.setState({ script: DEFAULT_SCRIPT });
    }

    return useStore.getState();
}
