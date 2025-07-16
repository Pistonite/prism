import {
    makeStyles,
    Text,
    MessageBar,
    MessageBarBody,
} from "@fluentui/react-components";
import { ResizeLayout } from "@pistonite/shared-controls";
import { CodeEditor, getNormalizedPath } from "@pistonite/intwc";

import { setCodeWindowPercentage, setScript, useStore } from "self::store";

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

const FILE_NAME = getNormalizedPath("main.ts");

export const Editor: React.FC = () => {
    const styles = useStyles();
    const scriptError = useStore((state) => state.scriptError);
    const messages = useStore((state) => state.output?.messages);
    const percentage = useStore((state) => state.codeWindowPercentage);

    return (
        <ResizeLayout
            className={styles.container}
            vertical
            valuePercent={percentage}
            setValuePercent={setCodeWindowPercentage}
        >
            <CodeEditor
                onCreated={(editor) => {
                    editor.openFile(
                        FILE_NAME,
                        useStore.getState().script,
                        "typescript",
                    );
                    const unsubsribeStore = useStore.subscribe((state) => {
                        editor.setFileContent(FILE_NAME, state.script);
                    });
                    const unsubscribeEditor = editor.subscribe(
                        "content-changed",
                        (file) => {
                            if (file !== FILE_NAME) {
                                return;
                            }
                            setScript(editor.getFileContent(file));
                        },
                    );
                    return () => {
                        unsubsribeStore();
                        unsubscribeEditor();
                    };
                }}
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
