import {
    Tooltip,
    Text,
    ToggleButton,
    makeStyles,
    Button,
} from "@fluentui/react-components";
import { fsSave } from "@pistonite/pure/fs";
import { Zoom } from "./Zoom";
import { useTranslation } from "react-i18next";
import { ArrowDownload24Regular, Grid24Regular, Question24Regular, Square24Regular } from "@fluentui/react-icons";

import { setForceSquare, setShowGrid, useStore, useSvgContent } from "data/store.ts";
import { useDark } from "@pistonite/pure-react";
import { ChangeDark } from "./ChangeDark";
import { ChangeLanguage } from "./ChangeLanguage";
import { useState } from "react";

export type ToolbarProps = {
    setZoom: (zoom: number) => void;
};

const useStyles = makeStyles({
    toolbar: {
        display: "flex",
        flexDirection: "row",
        gap: "4px",
        alignItems: "center",
        padding: "4px",
    },
    referenceText: {
        margin: "0",
    }
});

export const Toolbar: React.FC<ToolbarProps> = ({setZoom}) => {
    const {t} = useTranslation();
    const showGrid = useStore((state) => state.showGrid);
    const forceSquare = useStore((state) => state.forceSquare);
    const styles = useStyles();
    const svg = useSvgContent();
    const dark = useDark();

    const [showReference, setShowReference] = useState(false);
    return (
        <div
            style={{
            backgroundColor: dark ? "#00000066" : "#ffffff66",
        }}
        >
            <div className={styles.toolbar}
            >
                <Text>{t("ui.size")}: {toHumanReadableBytes(svg.length)} </Text>
                <Tooltip content={t("ui.download")} relationship="label">
                    <Button
                        appearance="subtle"
                        icon={<ArrowDownload24Regular />}
                        onClick={() => {
                            fsSave(svg, "prism-icon.svg");
                        }}
                    />
                </Tooltip>
                <Tooltip content={t("ui.square_icon")} relationship="label">
                    <ToggleButton
                        appearance="subtle"
                        icon={<Square24Regular />}
                        checked={forceSquare}
                        onClick={() => {
                            setForceSquare(!forceSquare);
                        }}
                    />
                </Tooltip>
                <Tooltip content={t("ui.toggle_grid")} relationship="label">
                    <ToggleButton
                        appearance="subtle"
                        icon={<Grid24Regular />}
                        checked={showGrid}
                        onClick={() => {
                            setShowGrid(!showGrid);
                        }}
                    />
                </Tooltip>

                <Zoom set={setZoom} />
                <Tooltip content={t("ui.reference")} relationship="label">
                    <ToggleButton
                        appearance="subtle"
                        icon={<Question24Regular />}
                        checked={showReference}
                        onClick={() => {
                            setShowReference(x => !x);
                        }}
                    />
                </Tooltip>

                <ChangeDark />
                <ChangeLanguage />
                <Button
                    as="a"
                    appearance="subtle"
                    icon={
                        <img
                            src={dark ? "/github-mark-white.svg" : "/github-mark.svg"}
                            width="20"
                        />
                    }
                    href="https://github.com/Pistonite/prism"
                    target="_blank"
                />
            </div>
            {
                showReference && (
                    <div>
                        <Text font="monospace">
                            <pre className={styles.referenceText}>
                                {`unit: f64
shader?: [color?, color?, color?]
color: color
pos?: [i32, i32, i32]
prism:
  - color?: color
    cut?: bool
    hidden?: bool
    pos: [i32, i32, i32]
    # One of:
    size: [i32, i32, i32]
    children: Prism[]`}
                            </pre>
                        </Text >
                    </div>
                )
            }

        </div>
    );
};

const toHumanReadableBytes = (bytes: number): string => {
    if (bytes < 1000) {
        return `${bytes.toString()} Bytes`;
    }
    if (bytes < 1000000) {
        return `${(bytes/1000).toFixed(2)} KB`;
    }
    return `${(bytes/1000000).toFixed(2)} MB`;
}
