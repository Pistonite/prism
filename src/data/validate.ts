import { createPrism, createPrismGroup } from "./create";
import { Prism, PrismGroup, PrismTree } from "./types";

/// Validate input PrismTree
export const copyValidate = (prism: PrismTree): PrismTree => {
    const isGroup = "children" in prism;
    const result: PrismTree = isGroup ? createPrismGroup() : createPrism();
    if (prism.position) {
        result.position.x = prism.position.x || 0;
        result.position.y = prism.position.y || 0;
        result.position.z = prism.position.z || 0;
    }
    if (isGroup) {
        const group = result as PrismGroup;
        if (prism.children) {
            group.children = prism.children.map(copyValidate);
        }
    } else {
        const p = result as Prism;
        if (prism.size) {
            p.size.x = prism.size.x || 1;
            p.size.y = prism.size.y || 1;
            p.size.z = prism.size.z || 1;
        }
    }

    return result;
}