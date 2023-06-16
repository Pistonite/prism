import { Grid, Color, Face, PrismFace, Shader } from "data";

type ColorAndFace = {
    color: Color,
    face: Face
};

const DEFAULT_COLOR = "#ffffff";

/// Convert a list of faces to grid layers
/// Each grid layer contains a single color, including shader layers
export const toGrids = (faces: PrismFace[], shader: Shader): [Record<string, Grid<boolean>>, Record<string, Grid<boolean>>] => {
    const grid: Grid<ColorAndFace> = {};
    faces.forEach(face => drawFace(grid, face));
    return separateColors(grid, shader);
};

/// Draw a face on a grid
const drawFace = (grid: Grid<ColorAndFace>, face: PrismFace) => {
    const ux = -face.position.x;
    const uy = face.position.y;
    const uz = 0;
    const vx = face.position.x;
    const vy = face.position.y;
    const vz = -2*face.position.z;
    const u = ux + uy + uz;
    const v = vx + vy + vz;
    switch(face.face) {
        case "z":
            setGrid(grid, u, v, {color: face.color, face: "z"});
            setGrid(grid, u+1, v, {color: face.color, face: "z"});
            break;
        case "x":
            setGrid(grid, u, v+1, {color: face.color, face: "x"});
            setGrid(grid, u, v+2, {color: face.color, face: "x"});
            break;
        case "y":
            setGrid(grid, u+1, v+1, {color: face.color, face: "y"});
            setGrid(grid, u+1, v+2, {color: face.color, face: "y"});
            break;
    }
}
/// Draw on a grid
export const setGrid = <T>(grid: Grid<T>, u: number, v: number, t: T) => {
    if (grid[u] === undefined) {
        grid[u] = {};
    }
    if (grid[u][v] !== undefined) {
        return;
    }
    grid[u][v] = t;
}

export const getGrid = <T>(grid: Grid<T>, u: number, v: number): T | undefined => {
    if (grid[u] === undefined) {
        return undefined;
    }
    return grid[u][v];
}

const separateColors = (grid: Grid<ColorAndFace>, shader: Shader): [Record<string, Grid<boolean>>, Record<string, Grid<boolean>>] => {
    const colorGrids: Record<string, Grid<boolean>> = {};
    const shaderGrids: Record<string, Grid<boolean>> = {};
    shaderGrids[shader.x || DEFAULT_COLOR] = {};
    shaderGrids[shader.y || DEFAULT_COLOR] = {};
    shaderGrids[shader.z || DEFAULT_COLOR] = {};

    for (const u in grid) {
        for (const v in grid[u]) {
            const {color, face} = grid[u][v];
            const c = color || DEFAULT_COLOR;
            if (c === "transparent") {
                // skip transparent faces, no shaders
                continue;
            }
            if (!(c in colorGrids)) {
                colorGrids[c] = {};
            }
            setGrid(colorGrids[c], Number(u), Number(v), true);
            switch(face) {
                case "x":
                    if (shader.x && shader.x !== "transparent") {
                        setGrid(shaderGrids[shader.x], Number(u), Number(v), true);
                    }
                    break;
                case "y":
                    if (shader.y && shader.z !== "transparent") {
                        setGrid(shaderGrids[shader.y], Number(u), Number(v), true);
                    }
                    break;
                case "z":
                    if (shader.z && shader.z !== "transparent") {
                        setGrid(shaderGrids[shader.z], Number(u), Number(v), true);
                    }
                    break;
            }

        }
    }
    return [colorGrids, shaderGrids];
}

