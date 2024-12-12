import { makeStyles, Text, MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useEffect, useState } from "react";

import { EditorState } from "data/editor.ts";
import { useStore } from "data/store.ts";
import { LANDSCAPE_QUERY } from "data/media.ts";

const useStyles = makeStyles({
    editorContainer: {
        minHeight: 0,
        display: "flex",
        flexDirection: "row",
        [LANDSCAPE_QUERY]: {
            width: "40%",
            flexDirection: "column",
        },
    },
    editor: {
        flex: 1,
        minHeight: 0,
    },
    console: {
        padding: "8px",
        boxSizing: "border-box",
        overflowY: "auto",
        overflowX: "hidden",
        flexGrow: 0.5,
        flexShrink: 2,
        flexBasis: 0,
    },
    consoleScroll: {
        maxHeight: 0,
    },
});

export const Editor: React.FC = () => {
    const ref = useMonacoEditor();
    const styles = useStyles();
    const scriptError = useStore((state) => state.scriptError);
    const messages = useStore((state) => state.output?.messages);

    return (
        <div className={styles.editorContainer}>
            <div className={styles.editor} ref={ref} />
            <div className={styles.console}>
                {
                    !!scriptError && (
                    <MessageBar intent="error"
                        >
                            <MessageBarBody>
                                {scriptError}
                            </MessageBarBody>
                    </MessageBar>
                    )
                }
                <div className={styles.consoleScroll}>
                    {
                        messages?.map((message, i) => (
                            <Text key={i} font="monospace" block wrap>
                                {message}
                            </Text>
                        ))
                    }
                </div>
            </div>
        </div>
    );
};

const useMonacoEditor = () => {
    const [ref, setRef] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (ref) {
            const editor = new EditorState(ref);
            return () => {
                editor.destroy();
            };
        }
    }, [ref]);

    return setRef;
}
