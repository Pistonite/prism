/// Convert polygons to svg

import { Point } from "data";

export const toSvgAndShifts = (polygons: Record<string, Point[][]>, shaders: Record<string, Point[][]>, scale: number): [string, number, number] => {
    const [minX, minY, width, height] = getBounds(Object.values(polygons));
    let paths = "";
    for (const color in polygons) {
        paths += toSvgPolygon(color, polygons[color], minX, minY, scale);
    }
    for (const color in shaders) {
        paths += toSvgPolygon(color, shaders[color], minX, minY, scale);
    }

    return [`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${width*scale}" height="${height*scale}">${paths}</svg>`, minX, minY];
}

/// Get the rectangular bounds of the polygons. Returns [minX, minY, width, height]
const getBounds = (polygonss: Point[][][]): [number, number, number, number] => {
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;
    polygonss.forEach(polygons => {
        polygons.forEach(polygon => {
            polygon.forEach(([x, y]) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            });
        });
    });
    return [minX, minY, (maxX-minX), (maxY-minY)];
}

const toSvgPolygon = (color: string, polygons: Point[][], shiftX: number, shiftY: number, scale: number): string => {
    // Get svg path data
    const path = polygons.map(polygon => {
        // normalize
        const normalizedPolygon = polygon.map(([x, y]): Point => [(x-shiftX)*scale, (y-shiftY)*scale]);
        return toPathStr(normalizedPolygon);
    }).join("");
    if (!path) {
        return "";
    }
    return `<path d="${path}" fill="${color}"/>`;

}

const toPathStr = (points: Point[]) => {
    const inner = points.map(([x, y]) => `${toCoordStr(x)} ${toCoordStr(y)}`).join("L");
    return `M${inner}Z`;
}

const PRECISION = 8;
const toCoordStr = (n: number): string => {
    const fixed = n.toFixed(PRECISION);
    const trimed = fixed.replace(/0*$/, "");
    return trimed.replace(/\.$/, "");
}
