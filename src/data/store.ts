import { PrismTree, Shader } from "./types";

/// Storage
export type Store = {
    /// The prism tree
    prism: PrismTree,
    /// The shader
    shader: Shader,
    /// The unit length
    unit: number,
}

const STORE_KEY = "Prism.State";
export const load = (): Store => {
    const storeStr = localStorage.getItem(STORE_KEY);
    if (!storeStr) {
        // default values
        return {
            prism: {
                name: "Root",
                color: "#ffffff",
                position: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                children: [
                    {
                        name: "Prism 1",
                        color: "#bbbbbb",
                        positive: true,
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
                        hidden: false,
                    }
                ],
                positive: true,
                hidden: false,
            },
            unit: 20,
            shader: {
                x: "rgba(0,0,0,0.15)",
                y: "rgba(0,0,0,0.4)",
                z: "",
            }
            
        };
    }
    return JSON.parse(storeStr);

}

export const save = (store: Store) => {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
}