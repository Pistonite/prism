import { Divider, Field, Input, SpinButton, SpinButtonOnChangeData, Switch } from "@fluentui/react-components";
import { PrismTree, Shader } from "data";
import { useState } from "react";

/// Props
type EditViewProps = {
    /// The prism to be edited
    prism: PrismTree;
    /// Callback to set the prism
    setPrism: (prism: PrismTree) => void;
    /// The shader to be edited
    shader: Shader;
    /// Callback to set the shader
    setShader: (shader: Shader) => void;
    /// The unit length to be edited
    unitLength: number;
    /// Callback to set the unit length
    setUnitLength: (unitLength: number) => void;
    /// Should the cut option be disabled (i.e. for root)
    disableCut: boolean;
}

const parseSpinButtonInt = (data: SpinButtonOnChangeData): number => {
    if (data.value !== null && data.value !== undefined) {
        return data.value;
    }
    const number = parseInt(data.displayValue || "");
    if (Number.isInteger(number)) {
        return number;
    }
    return 0;
}

const parseSpinButtonFloat = (data: SpinButtonOnChangeData): number => {
    if (data.value !== null && data.value !== undefined) {
        return data.value;
    }
    const number = parseFloat(data.displayValue || "");
    if (Number.isInteger(number)) {
        return number;
    }
    return 0;
}



/// View for editing the prism tree
export const EditView: React.FC<EditViewProps> = ({
    prism,
    setPrism,
    shader,
    setShader,
    unitLength,
    setUnitLength,
    disableCut
}) => {
    const isInterior = "children" in prism;
    const [globalShown, setGlobalShown] = useState<boolean>(false);
    return (
        <>
            <Divider>Basics</Divider>
            <Field label="Name" >
                <Input value={prism.name || ""} onChange={(_, data)=>setPrism({...prism, name: data.value})} />
            </Field>
            <Field label="Color" hint="Empty to inherit from parent">
                <Input placeholder="#FF0000" value={prism.color || ""} onChange={(_, data)=>setPrism({ ...prism, color:data.value })}/>
            </Field>
            <Divider>Position</Divider>
            <Field label="X (Left)">
                <SpinButton value={prism.position.x} onChange={(_, data)=>setPrism({...prism, position: {...prism.position, x: parseSpinButtonInt(data)}})}/>
            </Field>
            <Field label="Y (Right)" >
                <SpinButton value={prism.position.y} onChange={(_, data)=>setPrism({...prism, position: {...prism.position, y: parseSpinButtonInt(data)}})}/>
            </Field>
            <Field label="Z (Top)" >
                <SpinButton value={prism.position.z} onChange={(_, data)=>setPrism({...prism, position: {...prism.position, z: parseSpinButtonInt(data)}})}/>
            </Field>
            {
                !isInterior && (
                    <>
                        <Divider>Size</Divider>
                        <Field label="X size (Left)" >
                            <SpinButton value={prism.size.x} onChange={(_, data)=>setPrism({...prism, size: {...prism.size, x: parseSpinButtonInt(data)}})}/>
                        </Field>
                        <Field label="Y size (Right)">
                            <SpinButton value={prism.size.y} onChange={(_, data)=>setPrism({...prism, size: {...prism.size, y: parseSpinButtonInt(data)}})}/>
                        </Field>
                        <Field label="Z size (Top)">
                            <SpinButton value={prism.size.z} onChange={(_, data)=>setPrism({...prism, size: {...prism.size, z: parseSpinButtonInt(data)}})}/>
                        </Field>
                    </>
                )
            }
            <Switch label="Cut volume" disabled={disableCut} checked={!prism.positive} onChange={(_, data)=>setPrism({...prism, positive: !data.checked})}/>
            <Switch label="Hidden" checked={!!prism.hidden} onChange={(_, data)=>setPrism({...prism, hidden: data.checked})}/>
            <Switch label="Show global properties" checked={globalShown} onChange={(_, data)=>setGlobalShown(data.checked)}/>
            {
                globalShown && (
                    <>
                        <Divider>Image</Divider>
                        <Field label="Unit length" >
                            <SpinButton step={0.5} value={unitLength} onChange={(_, data)=>setUnitLength(parseSpinButtonFloat(data))}/>
                        </Field>
                        <Divider>Shader (Overlay)</Divider>
                        <Field label="X Color (Left)" >
                            <Input value={shader.x || ""} onChange={(_, data)=> setShader({...shader, x: data.value})}/>
                        </Field>
                        <Field label="Y Color (Right)">
                            <Input value={shader.y || ""} onChange={(_, data)=> setShader({...shader, y: data.value})}/>
                        </Field>
                        <Field label="Z Color (Top)">
                            <Input value={shader.z || ""} onChange={(_, data)=> setShader({...shader, z: data.value})}/>
                        </Field>
                    </>
                )
            }
        </>
    )
}