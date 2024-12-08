import { makeStyles } from "@fluentui/react-components";
import { EditorState } from "data/editor";
import { LANDSCAPE_QUERY } from "data/media";
import { useEffect, useState } from "react";

const useStyles = makeStyles({
    editorContainer: {
        minHeight: 0,
        minWidth: 0,
        flex: 1,
[LANDSCAPE_QUERY]: {
            maxWidth: "500px"
        }
    }

})

export const Editor: React.FC = () => {
    const [ref, setRef] = useState<HTMLDivElement | null>(null);

    const styles = useStyles();

    useEffect(() => {
        if (ref) {
            const editor = new EditorState(ref);
            return () => {editor.destroy()};
        }
    }, [ref]);

    return (
        <div className={styles.editorContainer} ref={setRef} />
    );
}
