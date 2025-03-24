import { makeStyles } from "@fluentui/react-components";
import { useMemo } from "react";

import { useStore, useSvgTransform } from "self::store";

type CanvasGridProps = {
    /// The canvas width
    width: number;
    /// The canvas height
    height: number;
    /// Color of the grid
    color: string;
    /** Color of the axis */
    axisColor: string;
};

const useStyles = makeStyles({
    gridContainer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "transparent",
    },
});

/** Grid lines for the canvas */
export const CanvasGrid: React.FC<CanvasGridProps> = ({
    width,
    height,
    color,
}) => {
    const zoom = useStore((state) => state.zoom);
    const translateX = useStore((state) => state.translateX);
    const translateY = useStore((state) => state.translateY);
    const { unit, shiftX, shiftY } = useSvgTransform();

    const yOffset = width / Math.sqrt(3);

    const lines = useMemo(() => {
        // Unit lengths (spacing between lines)
        let xSpacing = ((unit * Math.sqrt(3)) / 2) * zoom;
        let ySpacing = unit * zoom;
        if (xSpacing === 0 || ySpacing === 0) {
            return { x: [], y1: [], y2: [] };
        }
        // cap how many lines are drawn if the units are too small
        while (xSpacing < 10 || ySpacing < 10) {
            xSpacing *= 2;
            ySpacing *= 2;
        }
        // This is one line of the grid
        const xOrigin = -shiftX * unit * zoom + translateX;
        const y1Origin =
            -shiftY * ySpacing +
            ((-shiftX * unit * zoom) / Math.sqrt(3) +
                translateX / Math.sqrt(3)) +
            translateY +
            ySpacing / 2;
        const y2Origin =
            -shiftY * ySpacing -
            ((-shiftX * unit * zoom) / Math.sqrt(3) +
                translateX / Math.sqrt(3)) +
            translateY +
            ySpacing / 2;

        // The offset needed to maintain the grid angle
        const xLines = [];
        for (let x = xOrigin; x < width; x += xSpacing) {
            xLines.push(x);
        }
        for (
            let x = xOrigin - xSpacing;
            x > -Math.abs(translateX);
            x -= xSpacing
        ) {
            xLines.push(x);
        }

        const y1Lines = [];
        for (let y = y1Origin; y < height + yOffset; y += ySpacing) {
            y1Lines.push(y);
        }
        for (
            let y = y1Origin - ySpacing;
            y > -Math.abs(translateY);
            y -= ySpacing
        ) {
            y1Lines.push(y);
        }

        const y2Lines = [];
        for (let y = y2Origin; y < height; y += ySpacing) {
            y2Lines.push(y);
        }
        for (
            let y = y2Origin - ySpacing;
            y > -Math.abs(translateY) - yOffset;
            y -= ySpacing
        ) {
            y2Lines.push(y);
        }

        return { x: xLines, y1: y1Lines, y2: y2Lines };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unit, shiftX, shiftY, width, height, zoom, translateX, translateY]);

    const styles = useStyles();

    return (
        <div className={styles.gridContainer}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={width}
                height={height}
            >
                {lines.x.map((x, i) => (
                    <line
                        key={i}
                        y1={0}
                        y2={height}
                        x1={x}
                        x2={x}
                        stroke={color}
                    />
                ))}
                {lines.y1.map((y, i) => (
                    <line
                        key={i}
                        y1={y}
                        y2={y - yOffset}
                        x1={0}
                        x2={width}
                        stroke={color}
                    />
                ))}
                {lines.y2.map((y, i) => (
                    <line
                        key={i}
                        y1={y}
                        y2={y + yOffset}
                        x1={0}
                        x2={width}
                        stroke={color}
                    />
                ))}
            </svg>
        </div>
    );
};
