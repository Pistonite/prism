
/// Props for the grid view
type GridViewProps = {
    /// The zoom level
    scale: number;
    /// The unit length
    unitLength: number;
    /// The canvas width
    width: number;
    /// The canvas height
    height: number;
    /// The X translate of canvas
    translateX: number;
    /// The Y translate of canvas
    translateY: number;
    /// The X translate of svg
    svgXShift: number;
    /// The Y translate of svg
    svgYShift: number;
    /// Color of the grid
    color: string;
}

/// Grid view
export const GridView: React.FC<GridViewProps> = ({
    scale,
    unitLength,
    width,
    height,
    translateX,
    translateY,
    color,
    svgYShift,
    svgXShift
}) => {
    // Unit lengths (spacing between lines)
    const xUnitLength = unitLength * Math.sqrt(3) / 2 * scale;
    const yUnitLength = unitLength * scale;
    // This is one line of the grid
    const xOrigin = -svgXShift*unitLength*scale+translateX;
    const y1Origin = -svgYShift*yUnitLength+((-svgXShift*unitLength*scale)/Math.sqrt(3)+translateX/Math.sqrt(3))+translateY+yUnitLength/2;
    const y2Origin = -svgYShift*yUnitLength-((-svgXShift*unitLength*scale)/Math.sqrt(3)+translateX/Math.sqrt(3))+translateY+yUnitLength/2;
    // The offset needed to maintain the grid angle
    const yOffset = width/Math.sqrt(3);

    const xLines = [];
    for(let x = xOrigin; x < width; x += xUnitLength) {
        xLines.push(x);
    }
    for(let x=xOrigin-xUnitLength; x > -translateX; x -= xUnitLength) {
        xLines.push(x);
    }

    const y1Lines = [];
    for(let y = y1Origin; y < height + yOffset; y += yUnitLength) {
        y1Lines.push(y);
    }
    for(let y=y1Origin-yUnitLength; y > -translateY; y -= yUnitLength) {
        y1Lines.push(y);
    }

    const y2Lines = [];
    for(let y = y2Origin; y < height; y += yUnitLength) {
        y2Lines.push(y);
    }
    for(let y = y2Origin-yUnitLength; y > -translateY - yOffset; y -= yUnitLength) {
        y2Lines.push(y);
    }

    return (
        <div style={{ position: "absolute", top: 0}}>
            <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}>
                {
                    xLines.map((x, i) => (
                        <line key={i} y1={0} y2={height} x1={x} x2={x} stroke={color}/>
                    ))
                }
                {
                    y1Lines.map((y, i) => (
                        <line key={i} y1={y} y2={y-yOffset} x1={0} x2={width} stroke={color}/>
                    ))
                }
                {
                    y2Lines.map((y, i) => (
                        <line key={i} y1={y} y2={y+yOffset} x1={0} x2={width} stroke={color}/>
                    ))
                }
            </svg>
        </div>
    )

}