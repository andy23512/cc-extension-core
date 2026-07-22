// Entry points — an extension normally only needs these three.
export { mountContentScript } from "./lib/mount/mount-content-script.js";
export { mountOptionsPage } from "./lib/mount/mount-options-page.js";
export { registerBackground } from "./lib/mount/register-background.js";

// Configuration.
export {
  getRootElementId,
  type ReadNextText,
  type SiteConfig,
} from "./lib/model/site-config.model.js";

// Components, for extensions that need to compose their own UI.
export { default as AppComponent } from "./lib/component/app.component.js";
export { default as CCLiteLayoutComponent } from "./lib/component/cclite-layout.component.js";
export { default as LayoutComponent } from "./lib/component/layout.component.js";
export { default as LayoutContainerComponent } from "./lib/component/layout-container.component.js";
export { default as OptionsComponent } from "./lib/options/options.component.js";

// State.
export { useSettingsStore } from "./lib/store/settings-store.js";

// Data and utilities.
export { ICONS, type Icon } from "./lib/model/icon.model.js";
export {
  LITE_PRESET_DEVICE_LAYOUTS,
  PRESET_DEVICE_LAYOUTS,
} from "./lib/data/device-layouts.js";
export { KEYBOARD_LAYOUTS } from "./lib/data/keyboard-layouts.js";
export { HIGHLIGHT_SETTING } from "./lib/const/highlight-setting.const.js";
export {
  getHighlightKeyCombinationFromText,
  normalizeText,
} from "./lib/util/layout.util.js";
export {
  getViewBoxAspectRatio,
  getViewBoxHeight,
} from "./lib/util/layout-dimension.util.js";
export { generateCCLiteKeyboard, LITE_ASPECT_RATIO } from "./lib/util/lite.util.js";
