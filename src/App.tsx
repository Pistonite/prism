import { useEffect, useMemo, useRef, useState } from 'react'
import { Tree } from '@fluentui/react-components/unstable';
import { BulletedTreeListIcon, DownloadIcon, ShowGridIcon } from '@fluentui/react-icons-mdl2';
import { Toolbar, ToolbarButton, ToolbarDivider, ToolbarToggleButton, Text, Tooltip } from '@fluentui/react-components';
import { EditView, PrismTreeView, GridView, ZoomControl } from 'comp';
import { PrismTree, Shader, load, save } from 'data';
import { useTransformControl } from 'useTransformControl';
import { usePrismSvg } from 'usePrismSvg';
import { produce } from 'immer';
import { CodeControl } from 'comp/CodeControl';
import { fileSave } from 'browser-fs-access';

const TOOLBAR_KEY_GRID = "grid";
const TOOLBAR_KEY_SIDE_PANEL = "side-panel";
type ToolBarCheckedItems = {
    "_": string[];
}

const toHumanReadableBytes = (bytes: number): string => {
    if (bytes < 1000) {
        return `${bytes} Bytes`;
    }
    if (bytes < 1000000) {
        return `${(bytes/1000).toFixed(2)} KB`;
    }
    return `${(bytes/1000000).toFixed(2)} MB`;
}

export const App: React.FC = () => {
    const [prism, setPrism] = useState<PrismTree>(() => load().prism);
    const [shader, setShader] = useState<Shader>(() => load().shader);
    const [unitLength, setUnitLength] = useState<number>(() => load().unit);

    const [editingIndex, setEditingIndex] = useState<number[]>([]);
    const [editingPrism, setEditingPrism] = useMemo(() => {
        if (editingIndex.length === 0) {
            return [prism, setPrism];
        }
        let current = prism;
        for (let i=0;i<editingIndex.length;i++) {
            if (!("children" in current) || current.children.length <= editingIndex[i]) {
                return [prism, setPrism];
            }
            current = current.children[editingIndex[i]];
        }
        return [current, (prism: PrismTree) => {
            setPrism(produce(draft => {
                let current = draft;
                for (let i=0;i<editingIndex.length-1;i++) {
                    if (!("children" in current) || current.children.length <= editingIndex[i]) {
                        return;
                    }
                    current = current.children[editingIndex[i]];
                }
                const index = editingIndex[editingIndex.length-1];
                if (!("children" in current) || current.children.length <= index) {
                    return;
                }
                current.children[index] = prism;
            }));
        }];
    }, [prism, editingIndex]);

    // Save data to store on window close
    useEffect(() => {
        const saveToStore = () => {
            save({ prism, shader, unit: unitLength });
        }
        window.addEventListener("beforeunload", saveToStore);
        return () => {
            window.removeEventListener("beforeunload", saveToStore);
        }
    }, [prism, shader, unitLength]);

    const {
        zoom,
        minZoom,
        maxZoom,
        setZoom,
        translate,
        setTranslate
    } = useTransformControl();

    const [toolbarCheckedItems, setToolbarCheckedItems] = useState<ToolBarCheckedItems>({ _: [TOOLBAR_KEY_SIDE_PANEL] });
    const showGrid = toolbarCheckedItems._.includes(TOOLBAR_KEY_GRID);
    const showSidePanel = toolbarCheckedItems._.includes(TOOLBAR_KEY_SIDE_PANEL);

    const {
        svg,
        svgRef,
        svgTranslate
    } = usePrismSvg(prism, shader, unitLength);

    const json = useMemo(() => JSON.stringify(prism), [prism]);
    
    const canvasRef = useRef<HTMLDivElement>(null);

    const [dragStart, setDragStart] = useState<[number, number] | undefined>(undefined);

    return (
        <div id="main">
            {
                showSidePanel && (
                    <div id="left">
                        <div id="tree" className="section">
                            <Tree aria-label="Tree">
                                <PrismTreeView
                                    prism={prism}
                                    color={prism.color}
                                    index={[]}
                                    setEditingIndex={setEditingIndex}
                                    setPrism={setPrism}
                                />
                            </Tree>
                        </div>

                        <div id="edit" className="section">
                            <EditView
                                prism={editingPrism}
                                setPrism={setEditingPrism}
                                shader={shader}
                                setShader={setShader}
                                unitLength={unitLength}
                                setUnitLength={setUnitLength}
                            />

                        </div>
                    </div>
                )
            }
            
            <div id="middle">
                <Toolbar checkedValues={toolbarCheckedItems} onCheckedValueChange={(_, {checkedItems}) => {
                    setToolbarCheckedItems({ _: checkedItems });
                }}>
                    <Tooltip content="Toggle side panel" relationship="label">
                        <ToolbarToggleButton name="_" value={TOOLBAR_KEY_SIDE_PANEL} defaultChecked icon={<BulletedTreeListIcon />} />
                    </Tooltip>
                    <ToolbarDivider />
                    <ZoomControl scale={zoom} setScale={(zoom) => {
                        if (canvasRef.current) {
                            setZoom(zoom, canvasRef.current.clientWidth/2, canvasRef.current.clientHeight/2);
                        } else {
                            setZoom(zoom, 0, 0);
                        }
                    }} min={minZoom} max={maxZoom} />
                    <ToolbarDivider />
                    <Tooltip content="Toggle grid" relationship="label">
                        <ToolbarToggleButton name="_" value={TOOLBAR_KEY_GRID} icon={<ShowGridIcon />} />
                    </Tooltip>
                    <ToolbarDivider />
                    <CodeControl json={json} svg={svg} setPrism={setPrism} />
                    <ToolbarDivider />
                    <Tooltip content="Download SVG" relationship="label">
                        <ToolbarButton icon={<DownloadIcon />} onClick={() => {
                            fileSave(new Blob([svg]), { fileName: `${prism.name || "Prism"}.svg`, extensions: [".svg"] })
                        }}/>
                    </Tooltip>
                    <Text>Size: {toHumanReadableBytes(svg.length)}</Text>
                </Toolbar>
                
                <div id="canvas" ref={canvasRef} style={{ position: "relative", backgroundColor: "#eeeeee" }} onMouseDown={(e) => {
                    setDragStart([e.clientX - translate[0], e.clientY - translate[1]]);
                }} onMouseMove={(e) => {
                    if (!dragStart) {
                        return;
                    }
                    
                    setTranslate([e.clientX - dragStart[0], e.clientY - dragStart[1]]);
                }} onMouseUp={() => {
                    setDragStart(undefined);
                }} onWheel={(e) => {
                    const bound = canvasRef.current?.getBoundingClientRect();
                    if (e.deltaY < 0) {
                        setZoom(zoom * 1.1, e.clientX - (bound?.x || 0), e.clientY - (bound?.y || 0));
                    } else {
                        setZoom(zoom / 1.1, e.clientX - (bound?.x || 0), e.clientY - (bound?.y || 0));
                    }
                }}>
                    {
                        !dragStart && showGrid && (
                            <GridView
                                scale={zoom}
                                unitLength={unitLength}
                                width={canvasRef.current?.clientWidth || 0}
                                height={canvasRef.current?.clientHeight || 0}
                                translateX={translate[0]}
                                translateY={translate[1]}
                                color="#cccccc"
                                svgXShift={svgTranslate[0]}
                                svgYShift={svgTranslate[1]}
                            />
                        )
                    }
                    
                    <div style={{ translate: `${translate[0]}px ${translate[1]}px`, scale: `${zoom} ${zoom}`, transformOrigin: "top left" }}>
                        <div ref={svgRef} />
                    </div>
                </div>
            </div>
        </div>
    )
}

