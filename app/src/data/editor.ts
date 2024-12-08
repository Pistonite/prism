import { addDarkSubscriber, isDark } from "@pistonite/pure/pref";
import { setScript, useStore } from "data/store";
import { Debounce } from "Debounce";
import * as monaco from "monaco-editor";
import YamlWorker from "monaco-editor/esm/vs/basic-languages/yaml/yaml.js?worker";
import { SvgResult } from "wasm/lib/prism_app_wasm";

export async function initEditor() {
    self.MonacoEnvironment = {
        getWorker() {
            return new YamlWorker();
        },
    };
}

export class EditorState {
    private model: monaco.editor.ITextModel;
    private editor: monaco.editor.IStandaloneCodeEditor;

    constructor(node: HTMLElement) {
        const { script } = useStore.getState();

        const model = monaco.editor.createModel(script, "yaml");
        this.model = model;
        const theme = isDark() ? "vs-dark" : "vs";
        addDarkSubscriber((dark) => {
            monaco.editor.setTheme(dark ? "vs-dark" : "vs");
        });

        this.editor = monaco.editor.create(node, {
            model,
            theme,
        });
        model.onDidChangeContent(() => {
            setScript(model.getValue());
        });
        useStore.subscribe((state) => {
            if (state.script !== model.getValue()) {
                model.setValue(state.script);
            }
            this.updateMarkers(state.svg);
        });

        const resize = new Debounce(async () => {
            this.onSizeChange();
        }, 100);

        const resizeObserver = new ResizeObserver(() => {
            resize.execute();
        });

        resizeObserver.observe(node);
    }

    public destroy() {
        this.editor.dispose();
        this.model.dispose();
    }

    private onSizeChange() {
        this.editor.layout();
    }

    private updateMarkers(result: SvgResult) {
        const markers = [];
        if ("err" in result) {
            const { message, line, column } = result.err;
            const marker = this.createMarker(message, line, column);
            if (marker) {
                markers.push(marker);
            }
        }
        monaco.editor.setModelMarkers(this.model, "prism", markers);
    }

    private createMarker(
        message: string,
        line: number,
        column: number,
    ): monaco.editor.IMarkerData | undefined {
        const value = this.model.getValue();
        if (!value || line <= 0 || line > this.model.getLineCount()) {
            // don't add error if there is no content
            return undefined;
        }
        // get the word at the marker
        const range = {
            startLineNumber: line,
            startColumn: column,
            endLineNumber: line,
            endColumn: this.model.getLineLength(line) + 1,
        };
        const content = this.model.getValueInRange(range).split(" ", 2)[0];
        return {
            message,
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: line,
            startColumn: column,
            endLineNumber: line,
            endColumn: column + content.length,
        };
    }
}
