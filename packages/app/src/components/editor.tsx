import { makeStyles, Text, MessageBar, MessageBarBody } from "@fluentui/react-components";
import { ResizeLayout } from "@pistonite/celera";
import { SimpleEditor, StatusItemPreset } from "@pistonite/intwc";

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

    return (
        <ResizeLayout
            className={styles.container}
            vertical
            valuePercent={percentage}
            setValuePercent={setCodeWindowPercentage}
        >
            <SimpleEditor
                editorOptions={{
                    lineNumbers: "on"
                }}
                language="typescript"
                value={script}
                onValueChange={setScript}
                filename="script.ts"
                statusLeft={[
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
            <div className={styles.console}>
                {!!scriptError && (
                    <MessageBar intent="error">
                        <MessageBarBody>{scriptError}</MessageBarBody>
                    </MessageBar>
                )}
                <div className={styles.consoleScroll}>
                    {messages?.map((message, i) => (
                        <Text key={i} font="monospace" block wrap>
                            {message}
                        </Text>
                    ))}
                </div>
            </div>
        </ResizeLayout>
    );
};
