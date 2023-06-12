import { PrismFace, PrismRenderProps } from "data";


/// Convert the rendered prisms to virtual cubes, in the order they should be rendered
export const toFaces = (renderedPrisms: PrismRenderProps[]): PrismFace[] => {
    const out: PrismFace[] = [];
    renderedPrisms.forEach(prism => {
        addPrism(prism, out);
    });
    out.sort(cmpFace);
    return out;
}

const addPrism = (prism: PrismRenderProps, out: PrismFace[]) => {
    const x1 = prism.position.x;
    const y1 = prism.position.y;
    const z1 = prism.position.z;
    const x2 = prism.position.x + prism.size.x;
    const y2 = prism.position.y + prism.size.y;
    const z2 = prism.position.z + prism.size.z;
    // Render top faces
    for(let x=x1; x<x2; x++) {
        for(let y=y1; y<y2; y++) {
            out.push({
                position: {x, y, z: z2 - 1},
                face: "z",
                color: prism.color,
            });
        }
    }
    // Render front faces
    for(let y=y1; y<y2; y++) {
        for(let z=z1; z<z2; z++) {
            out.push({
                position: {x: x2-1, y, z},
                face: "x",
                color: prism.color,
            });
        }
    }
    // Render side faces
    for(let x=x1; x<x2; x++) {
        for(let z=z1; z<z2; z++) {
            out.push({
                position: {x, y: y2-1, z},
                face: "y",
                color: prism.color,
            });
        }
    }
    return out;
}

/// Compare the faces by render layer.
const cmpFace = (a: PrismFace, b: PrismFace): number => {
    return getLayer(b) - getLayer(a);
};

/// Get the render layer of a face
const getLayer = (face: PrismFace): number => {
    return face.position.x + face.position.y + face.position.z*2;
}