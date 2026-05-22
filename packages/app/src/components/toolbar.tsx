import { Tooltip, Text, ToggleButton, Button } from "@fluentui/react-components";
import { fsSave } from "@pistonite/webfs";
import { ArrowDownload24Regular, Grid24Regular, Square24Regular } from "@fluentui/react-icons";
import { DarkToggle, GitHubLink, LanguagePicker, useDark, useTranslation } from "@pistonite/celera";

import { setForceSquare, setShowGrid, useStore, useSvgContent } from "#store";

import { Zoom } from "./zoom.tsx";
import { useStyleEngine } from "./style.ts";

export interface ToolbarProps {
    setZoom: (zoom: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = (props) => {
    const { setZoom } = props;
    const t = useTranslation();
    const showGrid = useStore((state) => state.showGrid);
    const forceSquare = useStore((state) => state.forceSquare);
    const svg = useSvgContent();
    const dark = useDark();
    const m = useStyleEngine();

    return (
        <div style={{ backgroundColor: dark ? "#00000066" : "#ffffff66" }}>
            <div className={m("flex-row flex-centera gap-4 pad-4")}>
                <Text>
                    {t("size")}: {toHumanReadableBytes(svg.length)}{" "}
                </Text>
                <Tooltip content={t("download")} relationship="label">
                    <Button
                        appearance="subtle"
                        icon={<ArrowDownload24Regular />}
                        onClick={() => {
                            fsSave(svg, "prism-icon.svg");
                        }}
                    />
                </Tooltip>
                <Tooltip content={t("square_icon")} relationship="label">
                    <ToggleButton
                        appearance="subtle"
                        icon={<Square24Regular />}
                        checked={forceSquare}
                        onClick={() => {
                            setForceSquare(!forceSquare);
                        }}
                    />
                </Tooltip>
                <Tooltip content={t("toggle_grid")} relationship="label">
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
