import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useDark } from "@pistonite/celera";

import { useStore, setTranslate } from "#store";

import { useCanvas } from "./use_canvas.tsx";
import { CanvasGrid } from "./canvas_grid.tsx";
import { useStyleEngine } from "./style.ts";

export interface CanvasApi {
    /** Change zoom level center at the canvas center */
    setZoomAtCanvasCenter: (zoom: number) => void;
    /** Change zoom level center at the client point (relative to canvas origin) */
    setZoomAtClientPoint: (zoom: number, clientX: number, clientY: number) => void;
}

export const Canvas = forwardRef<CanvasApi>((_, ref) => {
    const canvasApi = useCanvas();

    useImperativeHandle(ref, () => canvasApi, [canvasApi]);

    const { canvasRef, width, height, setZoomAtClientPoint } = canvasApi;
    const zoom = useStore((state) => state.zoom);
    const translateX = useStore((state) => state.translateX);
    const translateY = useStore((state) => state.translateY);

    const [dragStart, setDragStart] = useState<[number, number] | undefined>();
    const dark = useDark();
    const showGrid = useStore((state) => state.showGrid);
    const m = useStyleEngine();

    const svgRef = useUpdateSvg();

    return (
        <div
            className={m("pos-rel wh-100 overflow-hidden")}
            ref={canvasRef}
            style={{ backgroundColor: dark ? "#222222" : "#eeeeee" }}
            onMouseDown={(e) => {
                setDragStart([e.clientX - translateX, e.clientY - translateY]);
            }}
            onMouseMove={(e) => {
                if (!dragStart) {
                    return;
                }

                setTranslate(e.clientX - dragStart[0], e.clientY - dragStart[1]);
            }}
            onMouseUp={() => {
                setDragStart(undefined);
            }}
            onWheel={(e) => {
                if (e.deltaY < 0) {
                    setZoomAtClientPoint(zoom * 1.1, e.clientX, e.clientY);
                } else {
                    setZoomAtClientPoint(zoom / 1.1, e.clientX, e.clientY);
                }
            }}
        >
            {!dragStart && showGrid && (
                <CanvasGrid
                    width={width}
                    height={height}
                    color={dark ? "#555555" : "#cccccc"}
                    axisColor={dark ? "#eeeeee" : "#111111"}
                />
            )}

            <div
                style={{
                    translate: `${translateX}px ${translateY}px`,
                    scale: `${zoom} ${zoom}`,
                    transformOrigin: "top left",
                }}
            >
                <div ref={svgRef} />
            </div>
        </div>
    );
});
Canvas.displayName = "Canvas";

const useUpdateSvg = () => {
    const svgRef = useRef<HTMLDivElement>(null);

    const svg = useStore((state) => state.output?.svg);
    useEffect(() => {
        if (!svgRef.current) {
            return;
        }
        // only update if we have a valid svg
        if (svg && svg.content) {
            svgRef.current.innerHTML = svg.content;
        }
    }, [svg]);

    return svgRef;
};
