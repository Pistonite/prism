import { addDarkSubscriber, isDark } from "@pistonite/pure/pref";
import * as monaco from "monaco-editor";
import TypeScriptWorker from "monaco-editor/esm/vs/language/typescript/ts.worker.js?worker";

import { setScript, useStore } from "data/store.ts";
import SCRIPT_LIB from "wasm/lib/scriptLib.ts?raw";

export async function initEditor() {
    self.MonacoEnvironment = {
        getWorker() {
            return new TypeScriptWorker();
        },
    };

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        lib: ["esnext"],
        noEmit: true,
        strict: true,
        noFallthroughCasesInSwitch: true,
    });

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
        SCRIPT_LIB,
        "file:///lib.ts",
    );
}

export class EditorState {
    private model: monaco.editor.ITextModel;
    private editor: monaco.editor.IStandaloneCodeEditor;

    private cleanup: () => void;

    constructor(node: HTMLElement) {
        const { script } = useStore.getState();

        const fileUri = monaco.Uri.parse("file:///main.ts");

        const model = monaco.editor.createModel(script, "typescript", fileUri);
        this.model = model;
        const theme = isDark() ? "vs-dark" : "vs";
        addDarkSubscriber((dark) => {
            monaco.editor.setTheme(dark ? "vs-dark" : "vs");
        });

        this.editor = monaco.editor.create(node, {
            model,
            theme,
            automaticLayout: true,
            "semanticHighlighting.enabled": true,
        });
        model.onDidChangeContent(() => {
            setScript(model.getValue());
        });
        const unsubscribe = useStore.subscribe((state) => {
            if (state.script !== model.getValue()) {
                model.setValue(state.script);
            }
        });

        this.cleanup = () => {
            unsubscribe();
        };
    }

    public destroy() {
        this.editor.dispose();
        this.model.dispose();
        this.cleanup();
    }
}
