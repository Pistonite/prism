import { Debounce } from "Debounce";
import { Latest } from "Latest";
import { PrismApiClient } from "wasm/sides/app";
import { SvgResult } from "wasm/lib";
import { create } from "zustand";

export type Store = {
    svg: SvgResult;
    script: string;
    forceSquare: boolean;
    showGrid: boolean;
    zoom: number;
    translateX: number;
    translateY: number;
};

export const useStore = create<Store>()(() => ({
    svg: { err: { message: "", line: 0, column: 0, index: 0 } },
    script: "",
    forceSquare: false,
    showGrid: false,
    zoom: 1,
    translateX: 0,
    translateY: 0,
}));

export const setForceSquare = (forceSquare: boolean) =>
    useStore.setState({ forceSquare });
export const setScript = (script: string) => useStore.setState({ script });
export const setShowGrid = (showGrid: boolean) =>
    useStore.setState({ showGrid });
export const setTranslate = (x: number, y: number) =>
    useStore.setState({ translateX: x, translateY: y });
export const setZoomAndTranslate = (zoom: number, x: number, y: number) =>
    useStore.setState({ zoom, translateX: x, translateY: y });

export const useSvgTransform = () => {
    const svgResult = useStore((state) => state.svg);
    if ("val" in svgResult) {
        const svg = svgResult.val;
        return {
            unit: svg.unit,
            shiftX: svg.shift_x,
            shiftY: svg.shift_y,
        };
    }
    return {
        unit: 20,
        shiftX: 0,
        shiftY: 0,
    };
};

export const useSvgContent = () => {
    const svgResult = useStore((state) => state.svg);
    if ("val" in svgResult) {
        return svgResult.val.content;
    }
    return "";
};

const STATE_KEY = "Prism.State";
const DEFAULT_SCRIPT = `color: "#ff0000"
prism:
  - pos: [0, 0, 0]
    size: [16, 16, 16]`;

export function initStore(api: PrismApiClient): Store {
    const save = new Debounce(async () => {
        const { script, showGrid, forceSquare } = useStore.getState();
        localStorage.setItem(
            STATE_KEY,
            JSON.stringify({ script, showGrid, forceSquare }),
        );
    }, 1000);
    const makeSvg = new Latest(async () => {
        const { script, forceSquare } = useStore.getState();
        const result = await api.makeSvg(script, forceSquare);
        if (result.err) {
            console.error(result.err);
            useStore.setState({
                svg: {
                    err: {
                        message: result.err.message,
                        line: 1,
                        column: 1,
                        index: 0,
                    },
                },
            });
            return;
        }
        console.log(result.val);
        useStore.setState({ svg: result.val });
    });
    useStore.subscribe((curr, prev) => {
        save.execute();
        if (
            curr.script !== prev.script ||
            curr.forceSquare !== prev.forceSquare
        ) {
            makeSvg.execute();
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
