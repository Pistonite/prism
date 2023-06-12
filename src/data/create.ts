import { Prism, PrismGroup } from "./types";

export const createPrism = (): Prism => ({
    name: "New Prism",
    color: undefined,
    position: {
        x: 0,
        y: 0,
        z: 0,
    },
    size: {
        x: 1,
        y: 1,
        z: 1,
    },
    positive: true,
    hidden: false,
});

export const createPrismGroup = (): PrismGroup => ({
    name: "New Prism",
    color: undefined,
    position: {
        x: 0,
        y: 0,
        z: 0,
    },
    children: [],
    positive: true,
    hidden: false,
});