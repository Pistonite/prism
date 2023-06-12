import { Slider, ToolbarButton, Text, Tooltip } from "@fluentui/react-components";
import { ZoomInIcon, ZoomOutIcon } from "@fluentui/react-icons-mdl2";

/// Prop for zoom control
type ZoomControlProps = {
    /// The current zoom (scale)
    scale: number;
    /// Callback to set the zoom
    setScale: (scale: number) => void;
    /// Minimum zoom
    min: number;
    /// Maximum zoom
    max: number;
}

/// The visual range of the control. 0 is in the middle. 100 means -100 to 100
const CONTROL_RANGE = 100;

const scaleToVisualValue = (scale: number, min: number, max: number): number => {
    if (scale === 1) {
        return 0;
    }
    if (scale < 1) {
        // ratio of scale (r=0 when scale = min, r=1 when scale=1)
        const r = (scale - min) / (1 - min);
        return r*CONTROL_RANGE - CONTROL_RANGE;
    }
    // ratio of scale (r=0 when scale = 1, r=1 when scale=max)
    const r = (scale - 1) / (max - 1);
    return r*CONTROL_RANGE;
}

const visualValueToScale = (value: number, min: number, max: number): number => {
    if (value === 0) {
        return 1;
    }
    if (value < 0) {
        const r = (value + CONTROL_RANGE) / CONTROL_RANGE;
        return r*(1 - min) + min;
    }
    const r = value / CONTROL_RANGE;
    return r*(max - 1) + 1;
}

/// The zoom control
export const ZoomControl: React.FC<ZoomControlProps> = ({ scale, setScale, min, max }) => {
    return (
        <>
            <Tooltip content="Zoom out" relationship="label">
                <ToolbarButton icon={<ZoomOutIcon />} onClick={() => {
                    setScale(scale - 0.1);
                }} disabled={scale <= min}/>
            </Tooltip>
            <Slider 
                value={scaleToVisualValue(scale, min, max) || 0}
                min={-CONTROL_RANGE}
                max={CONTROL_RANGE}
                onChange={(_,data)=>setScale(visualValueToScale(data.value, min, max))}
            />
            <Tooltip content="Zoom in" relationship="label">
                <ToolbarButton icon={<ZoomInIcon />} onClick={() => {
                    setScale(scale + 0.1);
                }} disabled={scale >= max}/>
            </Tooltip>
            <Text>{Math.round(scale*100)}%</Text>
        </>
    )
};