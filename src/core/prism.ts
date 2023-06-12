import { Color, PrismPos, PrismRenderProps, PrismTree } from "data";
/// Core prism algorithms

/// Random color generator, for debugging
// const _randomColor = (): Color => {
//     const r = Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
//     const g = Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
//     const b = Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
//     return `#${r}${g}${b}`;
// }

/// Render a prism tree into a list of render props
export const flattenPrismTree = (tree: PrismTree, parentColor: Color): PrismRenderProps[] => {
    if (tree.hidden) {
        // hidden
        return [];
    }
    if ("children" in tree) {
        // group
        let out: PrismRenderProps[] = [];
        // render each children
        tree.children.forEach(child => {
            const childRender = flattenPrismTree(child, tree.color || parentColor);
            if (child.positive) {
                // positive child
                out.push(...childRender);
            } else {
                // negative child
                out = subtractAll(out, childRender);
            }
        });
        return out;
    }

    // single prism
    if (!hasPositiveVolume(tree)) {
        // no volume
        return [];
    }
    return [{
        position: tree.position,
        size: tree.size,
        color: tree.color || parentColor,
    }];

}

/// Subtract prisms from a list of prisms, modify the list
const subtractAll = (array: PrismRenderProps[], operands: PrismRenderProps[]): PrismRenderProps[] => {
    if (operands.length === 0) {
        return array;
    }
    const out: PrismRenderProps[] = [];
    array.forEach((prism) => {
        operands.forEach(operand => {
            out.push(...subtract(prism, operand));
        });
    });
    return out;
}

/// Subtract a prism from one prism, only return positive volume prisms and may return empty array
/// a - b
const subtract = (a: PrismRenderProps, operand: PrismRenderProps): PrismRenderProps[] => {
    const b = intersection(a, operand);
    if (!hasPositiveVolume(b)) {
        // no intersection
        return [a];
    }
    const out = [];
    const aEndX = a.position.x + a.size.x;
    const aEndY = a.position.y + a.size.y;
    const aEndZ = a.position.z + a.size.z;
    const bEndX = b.position.x + b.size.x;
    const bEndY = b.position.y + b.size.y;
    const bEndZ = b.position.z + b.size.z;
    // bottom
    const bottom: PrismRenderProps = {
        color: a.color,
        position: {
            x: a.position.x,
            y: a.position.y,
            z: bEndZ
        },
        size: {
            x: a.size.x,
            y: a.size.y,
            z: aEndZ - bEndZ
        }
    };
    if (hasPositiveVolume(bottom)) {
        out.push(bottom);
    }
    // +X side
    const xPositive: PrismRenderProps = {
        color: a.color,
        position: {
            x: bEndX,
            y: a.position.y,
            z: b.position.z
        },
        size: {
            x: aEndX - bEndX,
            y: a.size.y,
            z: b.size.z
        }
    };
    if (hasPositiveVolume(xPositive)) {
        out.push(xPositive);
    }
    // -X side
    const xNegative: PrismRenderProps = {
        color: a.color,
        position: {
            x: a.position.x,
            y: a.position.y,
            z: b.position.z
        },
        size: {
            x: b.position.x - a.position.x,
            y: a.size.y,
            z: b.size.z
        }
    };
    if (hasPositiveVolume(xNegative)) {
        out.push(xNegative);
    }
    // +Y side
    const yPositive: PrismRenderProps = {
        color: a.color,
        position: {
            x: b.position.x,
            y: bEndY,
            z: b.position.z
        },
        size: {
            x: b.size.x,
            y: aEndY - bEndY,
            z: b.size.z
        }
    };
    if (hasPositiveVolume(yPositive)) {
        out.push(yPositive);
    }
    // -Y side
    const yNegative: PrismRenderProps = {
        color: a.color,
        position: {
            x: b.position.x,
            y: a.position.y,
            z: b.position.z
        },
        size: {
            x: b.size.x,
            y: b.position.y - a.position.y,
            z: b.size.z
        }
    };
    if (hasPositiveVolume(yNegative)) {
        out.push(yNegative);
    }
    // top
    const top: PrismRenderProps = {
        color: a.color,
        position: {
            x: a.position.x,
            y: a.position.y,
            z: a.position.z
        },
        size: {
            x: a.size.x,
            y: a.size.y,
            z: b.position.z - a.position.z
        }
    };
    if (hasPositiveVolume(top)) {
        out.push(top);
    }
    return out;
}

/// Returns the intersection of two prisms
/// If the intersection does not exist, return a prism with non-positive volume
const intersection = (a: PrismRenderProps, b: PrismRenderProps): PrismRenderProps => {
    return {
        color: a.color,
        position: {
            x: Math.max(a.position.x, b.position.x),
            y: Math.max(a.position.y, b.position.y),
            z: Math.max(a.position.z, b.position.z)
        },
        size: {
            x: Math.min(a.position.x + a.size.x, b.position.x + b.size.x) - Math.max(a.position.x, b.position.x),
            y: Math.min(a.position.y + a.size.y, b.position.y + b.size.y) - Math.max(a.position.y, b.position.y),
            z: Math.min(a.position.z + a.size.z, b.position.z + b.size.z) - Math.max(a.position.z, b.position.z)
        }
    };
}

/// Return if the prism has positive volume
const hasPositiveVolume = (prism: PrismPos): boolean => {
    return prism.size.x > 0 && prism.size.y > 0 && prism.size.z > 0;
}
