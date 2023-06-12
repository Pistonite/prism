/// Optimize grid

import { Grid, Point, Segment } from "data";
import { getGrid } from "./grid";

export const toPolylines = (grids: Record<string, Grid<boolean>>, shaders: Record<string, Grid<boolean>>): [Record<string, Point[][]>, Record<string, Point[][]>] => {
    const basePolygons: Record<string, Point[][]> = {};
    for(const color in grids) {
        basePolygons[color] = toPolygonsInternal(grids[color]);
    }
    const shaderPolygons: Record<string, Point[][]> = {};
    for(const color in shaders) {
        shaderPolygons[color] = toPolygonsInternal(shaders[color]);
    }
    // console.log(shaderPolygons);
    return [basePolygons, shaderPolygons];
}

/// Convert a grid to many polygons
const toPolygonsInternal = (grid: Grid<boolean>): Point[][] => {
    const uvLayer = toUVPoints(grid);
    const segments = getSegments(grid, uvLayer);
    const polygons = findPolygonsFromSegments(segments);
    return polygons;
}

/// Get segments in a uv layer
const getSegments = (grid: Grid<boolean>, uvs: Point[]): Segment[] => {
    const out: Segment[] = [];
    uvs.forEach(([u, v]) => {
        if (!getGrid(grid, u, v-1)) {
            // top side
            out.push({
                uv: [u, v],
                vertical: false
            });
        }
        if (!getGrid(grid, u, v+1)) {
            // bottom side
            out.push({
                uv: [u, v+1],
                vertical: false
            });
        }
        const isPointingLeft = (u+v)%2 === 0;
        if (isPointingLeft) {
            // right side
            if (!getGrid(grid, u+1, v)) {
                out.push({
                    uv: [u, v],
                    vertical: true
                });
            }
        } else {
            // left side
            if (!getGrid(grid, u-1, v)) {
                out.push({
                    uv: [u-1, v],
                    vertical: true
                });
            }
        }
    });
    return out;
}

const toUVPoints = (grid: Grid<boolean>): Point[] => {
    const points: Point[] = [];
    for (const u in grid) {
        for (const v in grid[u]) {
            if (grid[u][v]) {
                points.push([Number(u), Number(v)]);
            }
        }
    }
    return points;
}

/// Find segments that make a (closed) polygon. Return undefined if none found
const findPolygonsFromSegments = (segments: Segment[]): Point[][] => {
    const polygons: Point[][] = [];
    while(segments.length > 0) {
        // current stack top direction
        let negativeV = false;
        // stack for the current polygon
        const stack: Segment[] = [segments.pop()!]; // eslint-disable-line @typescript-eslint/no-non-null-assertion
        const directions: boolean[] = [negativeV];
        while(stack.length < 3 || getNextSegmentDirection(stack[stack.length-1], negativeV, stack[0]) === undefined) {
            const [nextI, nextNegativeV] = indexOfNextSegment(stack[stack.length-1], segments, negativeV);
            if (nextI === -1) {
                // no next segment found
                console.warn({
                    message: "No next segment found. This should not happen.",
                    stack: [...stack],
                    directions: [...directions],
                    segments: [...segments]
                });
                break;
            }
            stack.push(segments[nextI]);
            directions.push(nextNegativeV);
            segments.splice(nextI, 1);
            negativeV = nextNegativeV;
        }
        const polygon = createPolygonFromSegments(stack, directions);
        polygons.push(polygon);
    }
    return polygons;
}

/// Find the next segment in rest that can make a polygon.
/// negativeV is the direction of the current segment. If true, it is going in the negative v direction
/// Returns the index or -1 if none found, and if the next segment is in negative v direction
const indexOfNextSegment = (current: Segment, rest: Segment[], negativeV: boolean): [number, boolean] => {
    for(let i=0;i<rest.length;i++) {
        const result = getNextSegmentDirection(current, negativeV, rest[i]);
        if (result !== undefined) {
            return [i, result];
        }
    }
    return [-1, false];
}

/// Test if the next segment can be a valid next segment. Return undefined if not, and if the next segment is in negative v direction
const getNextSegmentDirection = (current: Segment, negativeV: boolean, next: Segment): boolean | undefined => {
    const [u, v] = current.uv;
    const [nu, nv] = next.uv;
    if (current.vertical) {
        if (negativeV) {
            if (nu === u && nv === v && !next.vertical) {
                return false;
            }
            if (nu === u && nv === v-1 && !next.vertical) {
                return true;
            }
            if (nu === u && nv === v-2 && next.vertical) {
                return true;
            }
            if (nu === u+1 && nv === v-1 && !next.vertical) {
                return true;
            }
            if (nu === u+1 && nv === v && !next.vertical) {
                return false;
            }
        } else {
            if (nu === u+1 && nv === v+1 && !next.vertical) {
                return true;
            }
            if (nu === u+1 && nv === v+2 && !next.vertical) {
                return false;
            }
            if (nu === u && nv === v+2 && next.vertical) {
                return false;
            }
            if (nu === u && nv === v+2 && !next.vertical) {
                return false;
            }
            if (nu === u && nv === v+1 && !next.vertical) {
                return true;
            }
        }
    } else {
        // if triangle is pointing left
        const isPointingLeft = (u+v)%2 === 0;
        if (negativeV) {
            if (isPointingLeft) {
                if (nu === u && nv === v-1 && !next.vertical) {
                    return true;
                }
                if (nu === u && nv === v-2 && next.vertical) {
                    return true;
                }
                if (nu === u+1 && nv === v-1 && !next.vertical) {
                    return true;
                }
                if (nu === u+1 && nv === v && !next.vertical) {
                    return false;
                }
                if (nu === u && nv === v && next.vertical) {
                    return false;
                }
            } else {
                if (nu === u-1 && nv == v && next.vertical) {
                    return false;
                }
                if (nu === u-1 && nv == v && !next.vertical) {
                    return false;
                }
                if (nu === u-1 && nv == v-1&& !next.vertical) {
                    return true;
                }
                if (nu === u-1 && nv == v-2 && next.vertical) {
                    return true;
                }
                if (nu === u && nv == v-1 && !next.vertical) {
                    return true;
                }
            }
        } else {
            if (isPointingLeft) {
                if (nu === u && nv === v+1 && !next.vertical) {
                    return false;
                }
                if (nu === u-1 && nv === v+1 && next.vertical) {
                    return false;
                }
                if (nu === u-1 && nv === v+1 && !next.vertical) {
                    return false;
                }
                if (nu === u-1 && nv === v && !next.vertical) {
                    return true;
                }
                if (nu === u-1 && nv === v-1 && next.vertical) {
                    return true;
                }
            } else {
                if (nu === u && nv === v-1 && next.vertical) {
                    return true;
                }
                if (nu === u+1 && nv === v && !next.vertical) {
                    return true;
                }
                if (nu === u+1 && nv === v+1 && !next.vertical) {
                    return false;
                }
                if (nu === u && nv === v+1 && next.vertical) {
                    return false;
                }
                if (nu === u && nv === v+1 && !next.vertical) {
                    return false;
                }
            }
        }
    }
    return undefined;
}

/// Create polygon vertices from segments
const createPolygonFromSegments = (segments: Segment[], negativeV: boolean[]): Point[] => {
    const points = [];
    for(let i=0;i<segments.length;i++) {
        const segment = segments[i];
        const negative = negativeV[i];
        if (i === 0 || !isColinear(segment, segments[i-1])) {
            points.push(getTail(segment, negative));
        }
    }
    return points;
}

/// Get the head point of a segment. Flip negativeV to get the tail point
const getHead = (segment: Segment, negativeV: boolean): Point => {
    const [u, v] = segment.uv;
    const isPointingLeft = (u+v)%2 === 0;
    if (isPointingLeft) {
        if (negativeV) {
            // same head if segment is vertical or not
            return [(u+1) * Math.sqrt(3)/2, v * 0.5];
        } else {
            if (segment.vertical) {
                return [(u+1) * Math.sqrt(3)/2, v * 0.5 + 1];
            } else {
                return [u * Math.sqrt(3)/2, (v+1) * 0.5];
            }
        }
    } else {
        // cannot be vertical
        if (negativeV) {
            return [u * Math.sqrt(3)/2, v * 0.5];
        } else {
            return [(u+1) * Math.sqrt(3)/2, (v+1) * 0.5];
        }
    }
}
/// Return if 2 adjacent segments of a polygon are on the same line
const isColinear = (s1: Segment, s2: Segment): boolean => {
    if (s1.vertical !== s2.vertical) {
        return false;
    }
    if (s1.vertical) {
        return true;
    }
    // the triangle need to point at the same direction
    const d1 = (s1.uv[0]+s1.uv[1])%2;
    const d2 = (s2.uv[0]+s2.uv[1])%2;
    return d1 === d2;
}

const getTail = (segment: Segment, negativeV: boolean): Point => {
    return getHead(segment, !negativeV);
}
