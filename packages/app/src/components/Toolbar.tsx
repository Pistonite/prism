import {
    Tooltip,
    Text,
    ToggleButton,
    makeStyles,
    Button,
} from "@fluentui/react-components";
import { fsSave } from "@pistonite/pure/fs";
import { useTranslation } from "react-i18next";
import {
    ArrowDownload24Regular,
    Grid24Regular,
    Square24Regular,
} from "@fluentui/react-icons";
import { useDark } from "@pistonite/pure-react";
import {
    DarkToggle,
    GitHubLink,
    LanguagePicker,
} from "@pistonite/shared-controls";

import {
    setForceSquare,
    setShowGrid,
    useStore,
    useSvgContent,
} from "self::store";

import { Zoom } from "./Zoom.tsx";

export type ToolbarProps = { setZoom: (zoom: number) => void };

const useStyles = makeStyles({
    toolbar: {
        display: "flex",
        flexDirection: "row",
        gap: "4px",
        alignItems: "center",
        padding: "4px",
    },
    referenceText: { margin: "0" },
});

export const Toolbar: React.FC<ToolbarProps> = ({ setZoom }) => {
    const { t } = useTranslation();
    const showGrid = useStore((state) => state.showGrid);
    const forceSquare = useStore((state) => state.forceSquare);
    const styles = useStyles();
    const svg = useSvgContent();
    const dark = useDark();

    return (
        <div style={{ backgroundColor: dark ? "#00000066" : "#ffffff66" }}>
            <div className={styles.toolbar}>
                <Text>
                    {t("ui.size")}: {toHumanReadableBytes(svg.length)}{" "}
                </Text>
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
                <DarkToggle />
                <LanguagePicker />
                <GitHubLink href="https://github.com/Pistonite/prism" />
            </div>
        </div>
    );
};

const toHumanReadableBytes = (bytes: number): string => {
    if (bytes < 1000) {
        return `${bytes.toString()} Bytes`;
    }
    if (bytes < 1000000) {
        return `${(bytes / 1000).toFixed(2)} KB`;
    }
    return `${(bytes / 1000000).toFixed(2)} MB`;
};
