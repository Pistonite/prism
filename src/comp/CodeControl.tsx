import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, Field, Tab, TabList, Textarea, ToolbarButton, Tooltip } from "@fluentui/react-components";
import { CodeEditIcon } from "@fluentui/react-icons-mdl2";
import { PrismTree, copyValidate } from "data";
import { useEffect, useState } from "react";

/// Prop for code control
type CodeControlProps = {
    /// The prism JSON
    json: string;
    /// The prism SVG
    svg: string;
    /// The callback to save the prism JSON
    setPrism: (prism: PrismTree) => void;
}

/// The dialog for editing/viewing JSON and SVG
export const CodeControl: React.FC<CodeControlProps> = ({ json, svg, setPrism }) => {
    const [selectedTab, setSelectedTab] = useState<string>("json");
    const [editingJson, setEditingJson] = useState<string>(json);
    const [deserialized, setDeserialized] = useState<PrismTree | null>(null);
    useEffect(() => {
        setEditingJson(json);
    }, [json]);
    useEffect(() => {
        try {
            setDeserialized(JSON.parse(editingJson));
        } catch (e) {
            setDeserialized(null);
        }
    }, [editingJson]);
    return (
        <Dialog>
            <DialogTrigger disableButtonEnhancement>
                <Tooltip content="Edit/View code" relationship="label">
                    <ToolbarButton icon={<CodeEditIcon />} />
                </Tooltip>
            </DialogTrigger>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>Edit</DialogTitle>
                    <DialogContent>
                        <TabList selectedValue={selectedTab} onTabSelect={(_, data) => setSelectedTab(data.value as string)}>
                            <Tab value="json">
                                JSON
                            </Tab>
                            <Tab value="svg">
                                SVG
                            </Tab>
                        </TabList>
                        <Field hint="You can modify the JSON or copy the SVG from here" validationMessage={deserialized ? undefined : "Invalid JSON string"}>
                            <Textarea
                                style={{ width: "100%"}}
                                resize="none"
                                value={selectedTab === "json" ? editingJson : svg}
                                readOnly={selectedTab === "svg"}
                                onChange={(_, data) => {
                                    if (selectedTab === "json") {
                                        setEditingJson(data.value || "");
                                    }
                                }}
                            />
                        </Field>
                        
                    </DialogContent>
                    <DialogActions>
                        <DialogTrigger disableButtonEnhancement>
                            <Button appearance="primary" disabled={deserialized === null} onClick={() => {
                                if (deserialized) {
                                    setPrism(copyValidate(deserialized));
                                }
                            }}>Ok</Button>
                        </DialogTrigger>
                        <DialogTrigger disableButtonEnhancement>
                            <Button appearance="secondary">Cancel</Button>
                        </DialogTrigger>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}