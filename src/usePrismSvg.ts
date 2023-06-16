import { flattenPrismTree, toFaces, toGrids, toPolylines, toSvgAndShifts } from "core";
import { PrismTree, Shader } from "data/types";
import { useEffect, useRef, useState, useTransition } from "react";

type PrismSvgData = {
    /// Ref for the div container of the SVG
    svgRef: React.RefObject<HTMLDivElement>,
    /// The SVG string
    svg: string,
    /// The SVG translation
    svgTranslate: [number, number],
}

/// Hook to convert Prism data to SVG
export const usePrismSvg = (prism: PrismTree, shader: Shader, unitLength: number, forceSquare: boolean): PrismSvgData => {
    const [svg, setSvg] = useState("");
    const [svgXShift, setSvgXShift] = useState(0);
    const [svgYShift, setSvgYShift] = useState(0);
    const svgRef = useRef<HTMLDivElement>(null);

    const [_, startTransition] = useTransition(); // eslint-disable-line @typescript-eslint/no-unused-vars

    useEffect(() => {
        const div = svgRef.current;
        if (!div) {
            return;
        }
        startTransition(() => {
            // flatten the prism tree into individual prisms
            const rendered = flattenPrismTree(prism, prism.color);
            // Convert the prisms to faces
            const faces = toFaces(rendered);
            // Draw the faces on the grid
            const [baseGrid, shaderGrid] = toGrids(faces, shader);
            // Convert the grid to polygones
            const [basePolygons, shaderPolygons] = toPolylines(baseGrid, shaderGrid);
            // Convert the polygons to SVG
            const [svg, xShift, yShift] =  toSvgAndShifts(basePolygons, shaderPolygons, unitLength, forceSquare);

            setSvg(svg);
            setSvgXShift(xShift);
            setSvgYShift(yShift);

            div.innerHTML = svg;
        });
        
    }, [svgRef, prism, shader, unitLength, forceSquare]);

    return {
        svgRef,
        svg,
        svgTranslate: [svgXShift, svgYShift],
    }
}