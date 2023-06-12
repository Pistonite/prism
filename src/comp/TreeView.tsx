import { Button, Menu, MenuDivider, MenuItem, MenuList, MenuPopover, MenuTrigger } from "@fluentui/react-components";
import { Tree, TreeItem, TreeItemLayout, TreeItemAside } from "@fluentui/react-components/unstable";
import { CubeShapeIcon, CubeShapeSolidIcon, CutIcon, EditIcon, Hide3Icon, MoreIcon } from "@fluentui/react-icons-mdl2";
import { createPrism, PrismTree, PrismGroup, Color } from "data";


/// Props type
type PrismTreeViewProps = {
    /// The index for each branch in the tree
    index: number[];
    /// The prism tree
    prism: PrismTree;
    /// The display color
    color: Color;
    /// Callback to set the current editing prism
    setEditingIndex: (index: number[]) => void;
    /// Callback to set the prism
    setPrism: (prism: PrismTree) => void;
    /// Callback to delete the prism
    onDelete?: () => void;
    /// Callback to move the prism up
    onMoveUp?: () => void;
    /// Callback to move the prism down
    onMoveDown?: () => void;
}

/// The tree element in the prism tree
export const PrismTreeView: React.FC<PrismTreeViewProps> = ({
    index,
    prism,
    color,
    setEditingIndex,
    setPrism,
    onDelete,
    onMoveUp,
    onMoveDown
}) => {
    const isInterior = "children" in prism;
    return (
        <TreeItem itemType={isInterior ? "branch" : "leaf"} value={index.join("-")}>
            <TreeItemLayout iconBefore={<PrismTreeIcon prism={prism} color={color}/>}>
                {prism.name || "(unnamed)"}
            </TreeItemLayout>
            <TreeItemAside actions>
                <Button
                    aria-label="Edit"
                    appearance="subtle"
                    icon={<EditIcon />}
                    onClick={(e) => {
                        setEditingIndex(index);
                        e.stopPropagation();
                    }}
                />
                <Menu>
                    <MenuTrigger>
                        <Button
                            aria-label="More options"
                            appearance="subtle"
                            icon={<MoreIcon />}
                        />
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList>
                            <MenuItem onClick={(e)=>{
                                if (isInterior) {
                                    const children = [...(prism as PrismGroup).children];
                                    children.push(createPrism());
                                    setPrism({ ...prism, children });
                                } else {
                                    setPrism({
                                        position: { ...prism.position },
                                        color: prism.color,
                                        name: prism.name,
                                        positive: prism.positive,
                                        children: [
                                            {
                                                name: "New Prism",
                                                color: undefined,
                                                position: {
                                                    x: 0,
                                                    y: 0,
                                                    z: 0,
                                                },
                                                size: {
                                                    ...prism.size
                                                },
                                                positive: true,
                                                hidden: false,
                                            }
                                        ],
                                        hidden: prism.hidden
                                    });
                                }
                                e.stopPropagation();
                            }}>Add Child</MenuItem>
                            <MenuDivider />
                            <MenuItem disabled={!onMoveUp} onClick={(e)=>{
                                onMoveUp?.();
                                e.stopPropagation();
                            }}>Move Up</MenuItem>
                            <MenuItem disabled={!onMoveDown} onClick={(e)=>{
                                onMoveDown?.();
                                e.stopPropagation();
                            }}>Move Down</MenuItem>
                            <MenuDivider />
                            <MenuItem disabled={!onDelete} onClick={(e)=>{
                                onDelete?.();
                                e.stopPropagation();
                            }}>Delete</MenuItem>
                        </MenuList>
                    </MenuPopover>
                </Menu>
            </TreeItemAside>
            {
                isInterior && (
                    <Tree>
                        {
                            (prism as PrismGroup).children.map((child, i) => (
                                <PrismTreeView
                                    key={i}
                                    index={[...index, i]}
                                    prism={child}
                                    color={child.color || color}
                                    setEditingIndex={setEditingIndex}
                                    setPrism={(child) => {
                                        const children = [...(prism as PrismGroup).children];
                                        children[i] = child;
                                        setPrism({ ...prism, children });
                                    }}

                                    onDelete={() => {
                                        const children = [...(prism as PrismGroup).children];
                                        children.splice(i, 1);
                                        if (children.length === 0) {
                                            setPrism({
                                                position: { ...prism.position },
                                                color: prism.color,
                                                name: prism.name,
                                                positive: prism.positive,
                                                hidden: prism.hidden,
                                                size: {
                                                    x: 0,
                                                    y: 0,
                                                    z: 0
                                                }
                                            });
                                        } else {
                                            setPrism({ ...prism, children });
                                        }
                                    }}

                                    onMoveUp={i > 0 ? () => {
                                        const children = [...(prism as PrismGroup).children];
                                        const temp = children[i - 1];
                                        children[i - 1] = children[i];
                                        children[i] = temp;
                                        setPrism({ ...prism, children });
                                    } : undefined}

                                    onMoveDown={i < (prism as PrismGroup).children.length - 1 ? () => {
                                        const children = [...(prism as PrismGroup).children];
                                        const temp = children[i + 1];
                                        children[i + 1] = children[i];
                                        children[i] = temp;
                                        setPrism({ ...prism, children });
                                    } : undefined}
                                />
                            ))
                        }
                    </Tree>
                )
            }
       </TreeItem >
    )
}

/// Icon Props Type
type PrismTreeIconProps = {
    /// The prism tree which the icon is for
    prism: PrismTree;
    /// The display color
    color: Color;
}

/// The icon for the prism tree
export const PrismTreeIcon: React.FC<PrismTreeIconProps> = ({ prism, color }) => {
    if (prism.hidden) {
        return <Hide3Icon />;
    }
    if (!prism.positive) {
        return <CutIcon />;
    }
    return (
        <span style={{
            display: "flex",
            width: 20,
            height: 20
        }}>
            <CubeShapeSolidIcon style={{color}}/>
            <CubeShapeIcon style={{position: "relative", left: -20}}/>
        </span>
    )
}

