/// Convert polygons to svg

import { Point } from "data";

export const toSvgAndShifts = (
    polygons: Record<string, Point[][]>,
    shaders: Record<string, Point[][]>,
    scale: number,
    forceSquare: boolean,
): [string, number, number] => {
    const [shiftX, shiftY, width, height] = getBounds(Object.values(polygons), forceSquare);
    let paths = "";
    for (const color in polygons) {
        paths += toSvgPolygon(color, polygons[color], shiftX, shiftY, scale);
    }
    for (const color in shaders) {
        paths += toSvgPolygon(color, shaders[color], shiftX, shiftY, scale);
    }
    //uncomment to see border
    //paths+=`<rect width="${width*scale}" height="${height*scale}" fill="none" stroke="black"/>`

    return [`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${width*scale}" height="${height*scale}">${paths}</svg>`, -shiftX, -shiftY];
}

/// Get the rectangular bounds of the polygons. Returns [shiftX, shiftY, width, height]
const getBounds = (polygonss: Point[][][], forceSquare: boolean): [number, number, number, number] => {
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
    if (!forceSquare) {
        return [-minX, -minY, (maxX-minX), (maxY-minY)];
    }

    let shiftX = -minX;
    let shiftY = -minY;
    const width = maxX - minX;
    const height = maxY - minY;
    const sideLength = Math.max(width, height);
    shiftX += (sideLength - width) / 2;
    shiftY += (sideLength - height) / 2;

    return [shiftX, shiftY, sideLength, sideLength];
}

const toSvgPolygon = (color: string, polygons: Point[][], shiftX: number, shiftY: number, scale: number): string => {
    // Get svg path data
    const path = polygons.map(polygon => {
        // normalize
        const normalizedPolygon = polygon.map(([x, y]): Point => [(x+shiftX)*scale, (y+shiftY)*scale]);
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
