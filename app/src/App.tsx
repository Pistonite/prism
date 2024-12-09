import { useRef } from "react";
import {
    FluentProvider,
    makeStaticStyles,
    makeStyles,
    webDarkTheme,
    webLightTheme,
} from "@fluentui/react-components";
import { useDark } from "@pistonite/pure-react";

import { Canvas, CanvasApi } from "components/Canvas";
import { Editor } from "components/Editor";
import { Toolbar } from "components/Toolbar";
import { LANDSCAPE_QUERY } from "data/media";

const useStaticStyles = makeStaticStyles({
    ":root": {
        fontSynthesis: "none",
        textRendering: "optimizeLegibility",
        "-webkit-font-smoothing": "antialiased",
        "-moz-osx-font-smoothing": "grayscale",
    },
    body: {
        margin: 0,
    },
});

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        [LANDSCAPE_QUERY]: {
            flexDirection: "row",
        },
    },
    container: {
        position: "relative",
        minWidth: 0,
        minHeight: 0,
        flex: 1,
    },
    toolbar: {
        position: "absolute",
        right: 0,
        zIndex: 100,
    },
    canvas: {
        width: "100%",
        height: "100%",
    },
});

export const App: React.FC = () => {
    useStaticStyles();
    const styles = useStyles();

    const canvas = useRef<CanvasApi>(null);

    const dark = useDark();

    return (
        <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
            <div className={styles.root}>
                <Editor />
                <div className={styles.container}>
                    <div className={styles.toolbar}>
                        <Toolbar
                            setZoom={(x: number) =>
                                canvas.current?.setZoomAtCanvasCenter(x)
                            }
                        />
                    </div>
                    <div className={styles.canvas}>
                        <Canvas ref={canvas} />
                    </div>
                </div>
            </div>
        </FluentProvider>
    );
};
