import { makeStyles } from "@fluentui/react-components";
import { ResizeLayout, useTranslation } from "@pistonite/celera";
import { SimpleEditor, StatusItemPreset } from "@pistonite/intwc";
import { useDebounce } from "@uidotdev/usehooks";

import { setCodeWindowPercentage, setScript, useStore } from "#store";

const useStyles = makeStyles({
    container: { width: "100%", height: "100%" },
    console: {
        padding: "8px",
        boxSizing: "border-box",
        overflowY: "auto",
        overflowX: "hidden",
        height: "100%",
    },
    consoleScroll: { maxHeight: 0 },
});

export const Editor: React.FC = () => {
    const styles = useStyles();
    const scriptError = useStore((state) => state.scriptError);
    const messages = useStore((state) => state.output?.messages);
    const percentage = useStore((state) => state.codeWindowPercentage);
    const script = useStore((state) => state.script);

    const consoleValueImmediate = scriptError ? scriptError : messages?.join("\n")  || "";
    const consoleValue = useDebounce(consoleValueImmediate, 200);

    const t = useTranslation();

    return (
        <ResizeLayout
            className={styles.container}
            vertical
            valuePercent={percentage}
            setValuePercent={setCodeWindowPercentage}
        >
            <SimpleEditor
                editorOptions={{
                    lineNumbers: "on",
                    minimap: {
                        enabled: true
                    }
                }}
                language="typescript"
                value={script}
                onValueChange={setScript}
                filename="script.ts"
                statusLeft={[
                    t("input_window"),
                    StatusItemPreset.DiagnosticErrors,
                    StatusItemPreset.DiagnosticWarnings,
                    StatusItemPreset.DiagnosticHints,
                ]}
                statusRight={[
                    StatusItemPreset.Position,
                    StatusItemPreset.WordWrap,
                    StatusItemPreset.Language,
                ]}
            />
            <SimpleEditor
                value={consoleValue}
                onValueChange={() =>{}}
                filename="console"
                editorOptions={{
                    readOnly: true
                }}
                statusLeft={[
                    t("output_window")
                ]}
                statusRight={[
                    StatusItemPreset.WordWrap,
                ]}
            />
        </ResizeLayout>
    );
};
