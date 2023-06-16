/// Optimize grid

import { Grid, Point, Segment } from "data";
import { getGrid, setGrid } from "./grid";

const MAX_TREE_DEPTH = 2048;

export const toPolylines = (grids: Record<string, Grid<boolean>>, shaders: Record<string, Grid<boolean>>): [Record<string, Point[][]>, Record<string, Point[][]>] => {
    const basePolygons: Record<string, Point[][]> = {};
    for (const color in grids) {
        basePolygons[color] = toPolygonsInternal(grids[color]);
    }
    const shaderPolygons: Record<string, Point[][]> = {};
    for (const color in shaders) {
        shaderPolygons[color] = toPolygonsInternal(shaders[color]);
    }
    return [basePolygons, shaderPolygons];
}

/// Convert a grid to many polygons
const toPolygonsInternal = (grid: Grid<boolean>): Point[][] => {
    const uvTrees = toUVTrees(grid);
    const polygons = uvTrees.map(tree => {
        const segments: Segment[] = [];
        addSegmentsFromTree(tree, segments, undefined);

        return optimizeSegments(segments);
    });
    return polygons;
}

type Tree = {
    center: Point,
    top: Tree | undefined,
    bottom: Tree | undefined,
    side: Tree | undefined,
}
type TreeSide = "top" | "bottom" | "side";

/// Convert grid to a tree of points
const toUVTrees = (grid: Grid<boolean>): Tree[] => {
    // clone the grid because we will mutate it
    const clonedGrid: Grid<boolean> = {};
    for (const u in grid) {
        for (const v in grid[u]) {
            if (grid[u][v]) {
                setGrid(clonedGrid, Number(u), Number(v), true);
            }
        }
    }
    const trees: Tree[] = [];
    let point = removeOnePointOnGrid(clonedGrid);
    while(point !== undefined) {
        const tree = findUVTreeHelper(clonedGrid, 0, point);
        trees.push(tree);
        point = removeOnePointOnGrid(clonedGrid);
   }
    return trees;
}

const removeOnePointOnGrid = (grid: Grid<boolean>): Point | undefined => {
    for (const u in grid) {
        for (const v in grid[u]) {
            if (grid[u][v]) {
                delete grid[u][v];
                return [Number(u), Number(v)];
            }
        }
    }
    return undefined
}

const findUVTreeHelper = (grid: Grid<boolean>, depth: number, center: Point): Tree => {
    const tree: Tree = {
        center,
        top: undefined,
        bottom: undefined,
        side: undefined,
    };
    if (depth > MAX_TREE_DEPTH) {
        return tree;
    }
    const [u, v] = center;
    // Get top subtree if possible (u, v-1)

    if (getGrid(grid, u, v - 1)) {
        delete grid[u][v-1];
        tree.top = findUVTreeHelper(grid, depth + 1, [u, v - 1]);
    }
    // Get bottom subtree if possible (u, v+1)
    if (getGrid(grid, u, v + 1)) {
        delete grid[u][v+1];
        tree.bottom = findUVTreeHelper(grid, depth + 1, [u, v + 1]);
    }
    // Get side subtree
    const isPointingLeft = (u + v) % 2 === 0;
    const side: Point = isPointingLeft ? [u + 1, v] : [u - 1, v];
    if (getGrid(grid, side[0], side[1])) {
        delete grid[side[0]][side[1]];
        tree.side = findUVTreeHelper(grid, depth + 1, side);
    }
    return tree;
}

/// Add segments from tree. The segments are added clockwise
const addSegmentsFromTree = (tree: Tree, segments: Segment[], fromSide: TreeSide | undefined) => {
    const [u, v] = tree.center;
    const isPointingLeft = (u + v) % 2 === 0;
    const addTopTree = () => {
        if (tree.top !== undefined) {
            addSegmentsFromTree(tree.top, segments, "bottom");
        } else {
            segments.push({
                uv: [u, v],
                vertical: false
            });
        }
    };
    const addBottomTree = () => {
        if (tree.bottom !== undefined) {
            addSegmentsFromTree(tree.bottom, segments, "top");
        } else {
            segments.push({
                uv: [u, v + 1],
                vertical: false
            });
        }
    };
    const addSideTree = () => {
        if (tree.side !== undefined) {
            addSegmentsFromTree(tree.side, segments, "side");
        } else {
            segments.push({
                uv: isPointingLeft ? [u, v] : [u - 1, v],
                vertical: true
            });
        }
    };
    if (!fromSide) {
        addTopTree();
        if (isPointingLeft) {
            addSideTree();
            addBottomTree();
        } else {
            addBottomTree();
            addSideTree();
        }
        return;
    }
    if (isPointingLeft) {
        switch (fromSide) {
            case "top":
                addSideTree();
                addBottomTree();
                break;
            case "bottom":
                addTopTree();
                addSideTree();
                break;
            case "side":
                addBottomTree();
                addTopTree();
                break;
        }
    } else {
        switch (fromSide) {
            case "top":
                addBottomTree();
                addSideTree();
                break;
            case "bottom":
                addSideTree();
                addTopTree();
                break;
            case "side":
                addTopTree();
                addBottomTree();
                break;
        }
    }
}

/// Remove unnecessary segments, and orient each segment in negative or positive directions
const optimizeSegments = (segments: Segment[]): Point[] => {
    if (segments.length < 3) {
        return [];
    }
    const optimizedSegments: Segment[] = [];
    const negativeVs: boolean[] = [];

    for (let i = 0; i < segments.length; i++) {
        if (optimizedSegments.length === 0 || negativeVs.length === 0) {
            if (i >= segments.length - 1) {
                console.warn("Fail to optimize segment: cannot get direction of segment", segments);
                return [];
            }
            const nextSegment = segments[i + 1];
            if (getNextSegmentDirection(segments[i], false, nextSegment) !== undefined) {
                negativeVs.push(false);
            } else if (getNextSegmentDirection(segments[i], true, nextSegment) !== undefined) {
                negativeVs.push(true);
            } else {
                // this means the next segment is the same as current segment, so we skip both
                if (!segmentsAreEqual(segments[i], nextSegment)) {
                    console.warn("Expecting 2 segments to be equal when optimizing, but they are not", {
                        nextSegment,
                        lastSegment: segments[i],
                    })
                }
                i++;
                continue;
            }
            optimizedSegments.push(segments[i]);
            continue;
        }
        const nextSegment = segments[i];
        const nextNegativeV = getNextSegmentDirection(
            optimizedSegments[optimizedSegments.length - 1],
            negativeVs[negativeVs.length - 1],
            nextSegment
        );
        if (nextNegativeV === undefined) {
            // The next segment is invalid, this can only mean that the next segment
            // is the same as last segment, but in the other direction.
            // so we remove the last segment
            if (!segmentsAreEqual(optimizedSegments[optimizedSegments.length - 1], nextSegment)) {
                console.warn("Expecting 2 segments to be equal when optimizing, but they are not", {
                    negativeV: negativeVs[negativeVs.length - 1],
                    nextSegment,
                    lastSegment: optimizedSegments[optimizedSegments.length - 1],
                })
            }
            
            optimizedSegments.pop();
            negativeVs.pop();
        } else {
            optimizedSegments.push(nextSegment);
            negativeVs.push(nextNegativeV);
        }
    }

    return createPolygonFromSegments(optimizedSegments, negativeVs);
}

const segmentsAreEqual = (a: Segment, b: Segment): boolean => {
    return a.uv[0] === b.uv[0] && a.uv[1] === b.uv[1] && a.vertical === b.vertical;
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
            if (nu === u && nv === v - 1 && !next.vertical) {
                return true;
            }
            if (nu === u && nv === v - 2 && next.vertical) {
                return true;
            }
            if (nu === u + 1 && nv === v - 1 && !next.vertical) {
                return true;
            }
            if (nu === u + 1 && nv === v && !next.vertical) {
                return false;
            }
        } else {
            if (nu === u + 1 && nv === v + 1 && !next.vertical) {
                return true;
            }
            if (nu === u + 1 && nv === v + 2 && !next.vertical) {
                return false;
            }
            if (nu === u && nv === v + 2 && next.vertical) {
                return false;
            }
            if (nu === u && nv === v + 2 && !next.vertical) {
                return false;
            }
            if (nu === u && nv === v + 1 && !next.vertical) {
                return true;
            }
        }
    } else {
        // if triangle is pointing left
        const isPointingLeft = (u + v) % 2 === 0;
        if (negativeV) {
            if (isPointingLeft) {
                if (nu === u && nv === v - 1 && !next.vertical) {
                    return true;
                }
                if (nu === u && nv === v - 2 && next.vertical) {
                    return true;
                }
                if (nu === u + 1 && nv === v - 1 && !next.vertical) {
                    return true;
                }
                if (nu === u + 1 && nv === v && !next.vertical) {
                    return false;
                }
                if (nu === u && nv === v && next.vertical) {
                    return false;
                }
            } else {
                if (nu === u - 1 && nv == v && next.vertical) {
                    return false;
                }
                if (nu === u - 1 && nv == v && !next.vertical) {
                    return false;
                }
                if (nu === u - 1 && nv == v - 1 && !next.vertical) {
                    return true;
                }
                if (nu === u - 1 && nv == v - 2 && next.vertical) {
                    return true;
                }
                if (nu === u && nv == v - 1 && !next.vertical) {
                    return true;
                }
            }
        } else {
            if (isPointingLeft) {
                if (nu === u && nv === v + 1 && !next.vertical) {
                    return false;
                }
                if (nu === u - 1 && nv === v + 1 && next.vertical) {
                    return false;
                }
                if (nu === u - 1 && nv === v + 1 && !next.vertical) {
                    return false;
                }
                if (nu === u - 1 && nv === v && !next.vertical) {
                    return true;
                }
                if (nu === u - 1 && nv === v - 1 && next.vertical) {
                    return true;
                }
            } else {
                if (nu === u && nv === v - 1 && next.vertical) {
                    return true;
                }
                if (nu === u + 1 && nv === v && !next.vertical) {
                    return true;
                }
                if (nu === u + 1 && nv === v + 1 && !next.vertical) {
                    return false;
                }
                if (nu === u && nv === v + 1 && next.vertical) {
                    return false;
                }
                if (nu === u && nv === v + 1 && !next.vertical) {
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
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const negative = negativeV[i];
        if (i === 0 || !isColinear(segment, segments[i - 1])) {
            points.push(getTail(segment, negative));
        }
    }
    return points;
}

/// Get the head point of a segment. Flip negativeV to get the tail point
const getTail = (segment: Segment, negativeV: boolean): Point => {
    const [u, v] = segment.uv;
    const isPointingLeft = (u + v) % 2 === 0;
    if (isPointingLeft) {
        if (negativeV) {
            if (segment.vertical) {
                return [(u + 1) * Math.sqrt(3) / 2, v * 0.5 + 1];
            } else {
                return [u * Math.sqrt(3) / 2, (v + 1) * 0.5];
            }
        } else {
            // same tail if segment is vertical or not
            return [(u + 1) * Math.sqrt(3) / 2, v * 0.5];

        }
    } else {
        // cannot be vertical
        if (negativeV) {
            return [(u + 1) * Math.sqrt(3) / 2, (v + 1) * 0.5];
        } else {
            return [u * Math.sqrt(3) / 2, v * 0.5];
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
    const d1 = (s1.uv[0] + s1.uv[1]) % 2;
    const d2 = (s2.uv[0] + s2.uv[1]) % 2;
    return d1 === d2;
}
