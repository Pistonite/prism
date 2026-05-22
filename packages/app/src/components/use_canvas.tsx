import { useEffect, useRef, useState } from "react";

import { setZoomAndTranslate, useStore } from "#store";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const clampZoom = (zoom: number) => {
    if (zoom < 1.1 && zoom > 0.91 && zoom !== 1) {
        return 1;
    }
    return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
};

export const useCanvas = () => {
    const zoom = useStore((state) => state.zoom);
    const translateX = useStore((state) => state.translateX);
    const translateY = useStore((state) => state.translateY);

    const setZoom = (value: number, centerX: number, centerY: number) => {
        const newZoom = clampZoom(value);
        const centerNormX = (centerX - translateX) / zoom;
        const centerNormY = (centerY - translateY) / zoom;
        const newCenterX = centerNormX * newZoom;
        const newCenterY = centerNormY * newZoom;
        const newTranslateX = centerX - newCenterX;
        const newTranslateY = centerY - newCenterY;
        setZoomAndTranslate(newZoom, newTranslateX, newTranslateY);
    };

    const canvasRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    useEffect(() => {
        const el = canvasRef.current;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setWidth(width);
            setHeight(height);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const setZoomAtClientPoint = (zoom: number, clientX: number, clientY: number) => {
        const bound = canvasRef.current?.getBoundingClientRect();
        setZoom(zoom, clientX - (bound?.x || 0), clientY - (bound?.y || 0));
    };
    const setZoomAtCanvasCenter = (zoom: number) => {
        if (!canvasRef.current) {
            setZoom(zoom, 0, 0);
            return;
        }
        const bound = canvasRef.current.getBoundingClientRect();
        setZoom(zoom, bound.width / 2, bound.height / 2);
    };

    return { canvasRef, width, height, setZoomAtCanvasCenter, setZoomAtClientPoint };
};
