import { useRef } from "react";
import {
    FluentProvider,
    makeStaticStyles,
    makeStyles,
    webDarkTheme,
    webLightTheme,
} from "@fluentui/react-components";
import { useDark } from "@pistonite/pure-react";
import { ResizeLayout } from "@pistonite/shared-controls";

import { Canvas, type CanvasApi, Editor, Toolbar } from "self::components";
import { setSideWindowPercentage, useStore } from "self::store";

const useStaticStyles = makeStaticStyles({
    ":root": {
        fontSynthesis: "none",
        textRendering: "optimizeLegibility",
        "-webkit-font-smoothing": "antialiased",
        "-moz-osx-font-smoothing": "grayscale",
    },
    body: { margin: 0 },
    "*": { minWidth: 0 },
});

const useStyles = makeStyles({
    root: { height: "100vh", width: "100vw" },
    container: { width: "100%", height: "100%" },
    toolbar: { position: "absolute", right: 0, zIndex: 100 },
    canvas: { width: "100%", height: "100%" },
});

export const App: React.FC = () => {
    useStaticStyles();
    const styles = useStyles();

    const canvas = useRef<CanvasApi>(null);

    const dark = useDark();
    const percentage = useStore((state) => state.sideWindowPercentage);

    return (
        <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
            <div className={styles.root}>
                <ResizeLayout
                    className={styles.container}
                    valuePercent={percentage}
                    setValuePercent={setSideWindowPercentage}
                >
                    <div className={styles.container}>
                        <Editor />
                    </div>
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
                </ResizeLayout>
            </div>
        </FluentProvider>
    );
};
