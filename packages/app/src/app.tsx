import { lazy, Suspense, useRef } from "react";
import { makeStaticStyles, makeStyles, Spinner } from "@fluentui/react-components";
import { ResizeLayout, ThemeProvider } from "@pistonite/celera";

import { Canvas, type CanvasApi, Toolbar } from "#components";
import { setSideWindowPercentage, useStore } from "#store";
import { useStyleEngine } from "./components/style";

const EditorLazy = lazy(async () => {
    const { getEditorComponent } = await import("./editor.ts");
    return { default: await getEditorComponent() };
});

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
    const m = useStyleEngine();

    const canvas = useRef<CanvasApi>(null);

    const percentage = useStore((state) => state.sideWindowPercentage);

    return (
        <ThemeProvider>
            <div className={styles.root}>
                <ResizeLayout
                    className={styles.container}
                    valuePercent={percentage}
                    setValuePercent={setSideWindowPercentage}
                >
                    <div className={styles.container}>
                        <Suspense
                            fallback={
                                <div className={m("flex flex-center h-100")}>
                                    <Spinner size="huge" />
                                </div>
                            }
                        >
                            <EditorLazy />
                        </Suspense>
                    </div>
                    <div className={styles.container}>
                        <div className={styles.toolbar}>
                            <Toolbar
                                setZoom={(x: number) => canvas.current?.setZoomAtCanvasCenter(x)}
                            />
                        </div>
                        <div className={styles.canvas}>
                            <Canvas ref={canvas} />
                        </div>
                    </div>
                </ResizeLayout>
            </div>
        </ThemeProvider>
    );
};
