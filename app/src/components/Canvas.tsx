import { useDark } from "@pistonite/pure-react";
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { makeStyles } from "@fluentui/react-components";

import { useStore, setTranslate } from "data/store.ts";
import { useCanvas } from "data/useCanvas.ts";

import { CanvasGrid } from "./CanvasGrid.tsx";

const useStyles = makeStyles({
    canvasContainer: {
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
    },
    svgContainer: {
        backgroundColor: "transparent",
    },
});

export type CanvasApi = {
    /** Change zoom level center at the canvas center */
    setZoomAtCanvasCenter: (zoom: number) => void;
    /** Change zoom level center at the client point (relative to canvas origin) */
    setZoomAtClientPoint: (
        zoom: number,
        clientX: number,
        clientY: number,
    ) => void;
};

export const Canvas = forwardRef<CanvasApi>((_, ref) => {
    const canvasApi = useCanvas();

    useImperativeHandle(ref, () => canvasApi, [canvasApi]);

    const { canvasRef, setZoomAtClientPoint } = canvasApi;
    const zoom = useStore((state) => state.zoom);
    const translateX = useStore((state) => state.translateX);
    const translateY = useStore((state) => state.translateY);

    const [dragStart, setDragStart] = useState<[number, number] | undefined>();
    const dark = useDark();
    const showGrid = useStore((state) => state.showGrid);
    const styles = useStyles();

    const svgRef = useUpdateSvg();

    return (
        <div
            className={styles.canvasContainer}
            ref={canvasRef}
            style={{ backgroundColor: dark ? "#222222" : "#eeeeee" }}
            onMouseDown={(e) => {
                setDragStart([e.clientX - translateX, e.clientY - translateY]);
            }}
            onMouseMove={(e) => {
                if (!dragStart) {
                    return;
                }

                setTranslate(
                    e.clientX - dragStart[0],
                    e.clientY - dragStart[1],
                );
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
                    width={canvasRef.current?.clientWidth || 0}
                    height={canvasRef.current?.clientHeight || 0}
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

    const svgResult = useStore((state) => state.svg);
    useEffect(() => {
        if (!svgRef.current) {
            return;
        }
        // only update if we have a valid svg
        if ("val" in svgResult) {
            const svg = svgResult.val;
            svgRef.current.innerHTML = svg.content;
        }
    }, [svgResult]);

    return svgRef;
};
