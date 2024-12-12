import { addDarkSubscriber, isDark } from "@pistonite/pure/pref";
// import { Debounce } from "@pistonite/pure/sync";
import * as monaco from "monaco-editor";
// import YamlWorker from "monaco-editor/esm/vs/basic-languages/yaml/yaml.js?worker";
import TypeScriptWorker from "monaco-editor/esm/vs/language/typescript/ts.worker.js?worker";

import { setScript, useStore } from "data/store.ts";
import SCRIPT_LIB from "wasm/lib/scriptLib.ts?raw";
// import type { PrismOutput } from "wasm/lib";
//

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

    monaco.languages.typescript.typescriptDefaults.addExtraLib(SCRIPT_LIB ,"file:///lib.ts");
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
            // this.updateMarkers(state.svg);
        });

        // const resize = new Debounce(async () => {
        //     this.onSizeChange();
        // }, 100);
        //
        // const resizeObserver = new ResizeObserver(() => {
        //     void resize.execute();
        // });
        //
        // resizeObserver.observe(node);

        this.cleanup = () => {
            // resizeObserver.disconnect();
            unsubscribe();
        };

    }

    public destroy() {
        this.editor.dispose();
        this.model.dispose();
        this.cleanup();
    }

    // private onSizeChange() {
    //     this.editor.layout();
    // }

    // private updateMarkers(result: SvgResult) {
    //     const markers = [];
    //     if ("err" in result) {
    //         const { message, line, column } = result.err;
    //         const marker = this.createMarker(message, line, column);
    //         if (marker) {
    //             markers.push(marker);
    //         }
    //     }
    //     monaco.editor.setModelMarkers(this.model, "prism", markers);
    // }
    //
    // private createMarker(
    //     message: string,
    //     line: number,
    //     column: number,
    // ): monaco.editor.IMarkerData | undefined {
    //     const value = this.model.getValue();
    //     if (!value || line <= 0 || line > this.model.getLineCount()) {
    //         // don't add error if there is no content
    //         return undefined;
    //     }
    //     // get the word at the marker
    //     const range = {
    //         startLineNumber: line,
    //         startColumn: column,
    //         endLineNumber: line,
    //         endColumn: this.model.getLineLength(line) + 1,
    //     };
    //     const content = this.model.getValueInRange(range).split(" ", 2)[0];
    //     return {
    //         message,
    //         severity: monaco.MarkerSeverity.Error,
    //         startLineNumber: line,
    //         startColumn: column,
    //         endLineNumber: line,
    //         endColumn: column + content.length,
    //     };
    // }
}
