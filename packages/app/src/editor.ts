import { initCodeEditor } from "@pistonite/intwc";

import { Editor } from "./components/editor.tsx";
import PrismLibTs from "./prism_lib.gen.ts?raw";

export const getEditorComponent = async () => {
    await initCodeEditor({
        language: {
            typescript: {
                lib: ["esnext"],
                customLibs: [{ name: "prism-lib.ts", content: PrismLibTs }],
            },
        },
    });
    return Editor;
}
