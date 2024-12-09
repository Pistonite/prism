import { makeStyles } from "@fluentui/react-components";
import { useEffect, useState } from "react";

import { EditorState } from "data/editor.ts";
import { LANDSCAPE_QUERY } from "data/media.ts";

const useStyles = makeStyles({
    editorContainer: {
        minHeight: 0,
        minWidth: 0,
        [LANDSCAPE_QUERY]: {
            width: "500px",
        },
    },
});

export const Editor: React.FC = () => {
    const [ref, setRef] = useState<HTMLDivElement | null>(null);

    const styles = useStyles();

    useEffect(() => {
        if (ref) {
            const editor = new EditorState(ref);
            return () => {
                editor.destroy();
            };
        }
    }, [ref]);

    return <div className={styles.editorContainer} ref={setRef} />;
};
