import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ChangeEvent, MouseEvent, useState } from "react";
import {
  downloadDeviceLayout,
  KeyboardLayout,
  LayoutType,
} from "tangent-cc-lib";
import { KEYBOARD_LAYOUTS } from "../data/keyboard-layouts.js";
import { SiteConfig } from "../model/site-config.model.js";
import { useSettingsStore } from "../store/settings-store.js";
import {
  findDeviceLayoutForExport,
  parseDeviceLayoutFromBackup,
  upsertDeviceLayout,
} from "../util/device-layout-import.util.js";

interface OptionsComponentProps {
  config: SiteConfig;
}

export const OptionsComponent = ({ config }: OptionsComponentProps) => {
  const layoutType = useSettingsStore.use.layoutType();
  const isLiteLayoutType = layoutType === "lite";
  const layout = useSettingsStore.use.currentLayout();
  const customDeviceLayouts = useSettingsStore.use.currentCustomDeviceLayouts();
  const selectedKeyboardLayoutId =
    useSettingsStore.use.selectedKeyboardLayoutId();
  const showThumb3Switch = useSettingsStore.use.showThumb3Switch();
  const highlightKeysEnabled = useSettingsStore.use.highlightKeysEnabled();
  const setSettings = useSettingsStore.use.set();

  const [status, setStatus] = useState<string>("");

  const defaultKeyboardLayout = KEYBOARD_LAYOUTS.find(
    (k) => k.id === "us",
  ) as KeyboardLayout;
  const selectedKeyboardLayout =
    KEYBOARD_LAYOUTS.find((k) => k.id === selectedKeyboardLayoutId) ??
    defaultKeyboardLayout;

  const handleLayoutTypeChange = (
    _: MouseEvent<HTMLElement>,
    nextLayoutType: LayoutType,
  ) => {
    setSettings("layoutType", nextLayoutType);
    showSavedMessage();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files === null || files.length === 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        return;
      }
      const data = JSON.parse(e.target.result as string);
      const deviceLayout = parseDeviceLayoutFromBackup(
        data,
        file.name,
        isLiteLayoutType,
      );
      if (!deviceLayout) {
        return;
      }
      setSettings("layout", deviceLayout.id);
      setSettings(
        "customDeviceLayouts",
        upsertDeviceLayout(customDeviceLayouts, deviceLayout),
      );
      showSavedMessage();
    };
    reader.readAsText(file);
  };

  const handleLayoutChange = (event: SelectChangeEvent) => {
    const nextLayout = event.target.value;
    const nextShowThumb3Switch =
      nextLayout === "m4g"
        ? false
        : nextLayout === "cc1"
        ? true
        : showThumb3Switch;
    setSettings("layout", nextLayout);
    setSettings("showThumb3Switch", nextShowThumb3Switch);
    showSavedMessage();
  };

  const handleShowThumb3SwitchChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.checked;
    setSettings("showThumb3Switch", value);
    showSavedMessage();
  };

  const handleHighlightKeysEnabledChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.checked;
    setSettings("highlightKeysEnabled", value);
    showSavedMessage();
  };

  const handleSelectedKeyboardLayoutChange = (
    _: any,
    newValue: KeyboardLayout | null,
  ) => {
    const value = newValue?.id ?? "us";
    setSettings("selectedKeyboardLayoutId", value);
    showSavedMessage();
  };

  const getKeyboardLayoutOptionLabel = (keyboardLayout: KeyboardLayout) =>
    keyboardLayout.name;

  function showSavedMessage() {
    setStatus("Setting saved.");
    const id = setTimeout(() => {
      setStatus("");
    }, 1000);
    return () => clearTimeout(id);
  }

  function handleDeviceLayoutExport() {
    const deviceLayout = findDeviceLayoutForExport(
      layout,
      customDeviceLayouts,
      isLiteLayoutType,
    );
    if (!deviceLayout) {
      return;
    }
    downloadDeviceLayout(deviceLayout);
  }

  return (
    <Box sx={{ maxWidth: "800px", mx: "auto" }}>
      <AppBar enableColorOnDark={true} position="static">
        <Typography variant="h6" sx={{ mx: 2 }}>
          {config.siteName} CC Extension - Options
        </Typography>
      </AppBar>
      <div className="p-3 flex flex-col items-center">
        <div className="mt-4">
          <ol className="list-inside list-decimal text-base space-y-2">
            <li>
              Select a layout type.
              <br />
              <ToggleButtonGroup
                sx={{ mt: 1 }}
                color="primary"
                value={layoutType}
                exclusive
                onChange={handleLayoutTypeChange}
              >
                <ToggleButton value="3d">3D input device</ToggleButton>
                <ToggleButton value="lite">Lite</ToggleButton>
              </ToggleButtonGroup>
            </li>
            <li>
              (Optional) Import a device layout file (the backup file from
              CharaChorder Device Manager website).
              <br />
              <Button
                sx={{ mt: 1 }}
                component="label"
                role={undefined}
                variant="contained"
                tabIndex={-1}
              >
                Choose File
                <input
                  className="opacity-0 size-[1px]"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                ></input>
              </Button>
            </li>
            <li>
              Select a loaded device layout.
              <div className="mt-2 flex gap-2">
                {isLiteLayoutType ? (
                  <Select value={layout} onChange={handleLayoutChange}>
                    <MenuItem value="cclite">
                      CharaChorder Lite - Default
                    </MenuItem>
                    {customDeviceLayouts.map((layout) => (
                      <MenuItem value={layout.id}>{layout.name}</MenuItem>
                    ))}
                  </Select>
                ) : (
                  <Select value={layout} onChange={handleLayoutChange}>
                    <MenuItem value="cc1">
                      CharaChorder One / CharaChorder Two / CCU - Default
                    </MenuItem>
                    <MenuItem value="m4g">Master Forge - Default</MenuItem>
                    <MenuItem value="cc1-left-hand-only">
                      CharaChorder One / CharaChorder Two / CCU - Left Hand Only
                    </MenuItem>
                    <MenuItem value="cc1-right-hand-only">
                      CharaChorder One / CharaChorder Two / CCU - Right Hand
                      Only
                    </MenuItem>
                    {customDeviceLayouts.map((layout) => (
                      <MenuItem value={layout.id}>{layout.name}</MenuItem>
                    ))}
                  </Select>
                )}
                <Button
                  component="label"
                  role={undefined}
                  variant="outlined"
                  tabIndex={-1}
                  onClick={handleDeviceLayoutExport}
                >
                  Export
                </Button>
              </div>
            </li>
            <li>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showThumb3Switch}
                    disabled={isLiteLayoutType}
                    onChange={handleShowThumb3SwitchChange}
                  />
                }
                label="Show Thumb 3 Switch"
              />
            </li>
            <li>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={highlightKeysEnabled}
                    onChange={handleHighlightKeysEnabledChange}
                  />
                }
                label="Highlight Keys"
              />
            </li>
            <li>
              Select an OS keyboard layout.
              <br />
              <Autocomplete
                sx={{ mt: 1 }}
                options={KEYBOARD_LAYOUTS}
                getOptionLabel={getKeyboardLayoutOptionLabel}
                defaultValue={defaultKeyboardLayout}
                value={selectedKeyboardLayout}
                onChange={handleSelectedKeyboardLayoutChange}
                renderInput={(params) => <TextField {...params}></TextField>}
              ></Autocomplete>
            </li>
          </ol>
          <Snackbar
            open={!!status}
            message={status}
            anchorOrigin={{ horizontal: "center", vertical: "top" }}
          ></Snackbar>
        </div>
      </div>
    </Box>
  );
};

export default OptionsComponent;
