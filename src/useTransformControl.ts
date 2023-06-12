import { useCallback, useState } from "react";

/// Hook for controlling zoom and translate
type TransformControl = {
    /// Current zoom
    zoom: number,
    /// Zoom min max
    minZoom: number,
    maxZoom: number,
    /// Callback to set zoom
    setZoom: (zoom: number, centerX: number, centerY: number) => void,
    /// Current translate
    translate: [number, number],
    /// Callback to set translate
    setTranslate: (translate: [number, number]) => void,
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

const clampZoom = (zoom: number) => {
    if (zoom < 1.1 && zoom > 0.91 && zoom !== 1) {
        return 1;
    }
    return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

export const useTransformControl = (): TransformControl => {
    const [zoom, setZoomInternal] = useState<number>(1);
    const [translateX, setTranslateX] = useState<number>(0);
    const [translateY, setTranslateY] = useState<number>(0);

    const setZoom = useCallback((value: number, centerX: number, centerY: number) => {
        const newZoom = clampZoom(value);
        const centerNormX = (centerX - translateX) / zoom;
        const centerNormY = (centerY - translateY) / zoom;
        const newCenterX = centerNormX * newZoom;
        const newCenterY = centerNormY * newZoom;
        const newTranslateX = centerX - newCenterX;
        const newTranslateY = centerY - newCenterY;
        setZoomInternal(newZoom);
        setTranslateX(newTranslateX);
        setTranslateY(newTranslateY);
    }, [zoom, translateX, translateY]);
    
    const setTranslate = useCallback((value: [number, number]) => {
        setTranslateX(value[0]);
        setTranslateY(value[1]);
    }, []);

    return {
        zoom,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        setZoom,
        translate: [translateX, translateY],
        setTranslate,
    };
}