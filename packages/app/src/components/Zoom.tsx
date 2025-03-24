import {
    Slider,
    Text,
    Tooltip,
    Button,
    makeStyles,
} from "@fluentui/react-components";
import { ZoomIn24Regular, ZoomOut24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import { useStore } from "self::store";

import { MAX_ZOOM, MIN_ZOOM } from "./useCanvas.ts";

/// The visual range of the control. 0 is in the middle. 100 means -100 to 100
const SLIDER_RANGE = 100;

const scaleToSlider = (scale: number, min: number, max: number): number => {
    if (scale === 1) {
        return 0;
    }
    if (scale < 1) {
        // ratio of scale (r=0 when scale = min, r=1 when scale=1)
        const r = (scale - min) / (1 - min);
        return r * SLIDER_RANGE - SLIDER_RANGE;
    }
    // ratio of scale (r=0 when scale = 1, r=1 when scale=max)
    const r = (scale - 1) / (max - 1);
    return r * SLIDER_RANGE;
};

const sliderToScale = (value: number, min: number, max: number): number => {
    if (value === 0) {
        return 1;
    }
    if (value < 0) {
        const r = (value + SLIDER_RANGE) / SLIDER_RANGE;
        return r * (1 - min) + min;
    }
    const r = value / SLIDER_RANGE;
    return r * (max - 1) + 1;
};

/// Prop for zoom control
type ZoomProps = { set: (zoom: number) => void };

const useStyles = makeStyles({
    zoomLabel: { minWidth: "40px", textAlign: "end" },
});

/** Zoom button and slider*/
export const Zoom: React.FC<ZoomProps> = ({ set }) => {
    const min = MIN_ZOOM;
    const max = MAX_ZOOM;
    const zoom = useStore((state) => state.zoom);
    const { t } = useTranslation();
    const styles = useStyles();
    return (
        <>
            <Tooltip content={t("ui.zoom_out")} relationship="label">
                <Button
                    appearance="subtle"
                    icon={<ZoomOut24Regular />}
                    onClick={() => {
                        set(zoom - 0.1);
                    }}
                    disabled={zoom <= min}
                />
            </Tooltip>
            <Slider
                value={scaleToSlider(zoom, min, max) || 0}
                min={-SLIDER_RANGE}
                max={SLIDER_RANGE}
                onChange={(_, data) => {
                    set(sliderToScale(data.value, min, max));
                }}
            />
            <Tooltip content={t("ui.zoom_in")} relationship="label">
                <Button
                    appearance="subtle"
                    icon={<ZoomIn24Regular />}
                    onClick={() => {
                        set(zoom + 0.1);
                    }}
                    disabled={zoom >= max}
                />
            </Tooltip>
            <Text block className={styles.zoomLabel}>
                {Math.round(zoom * 100)}%
            </Text>
        </>
    );
};
