import browser from "webextension-polyfill";

/** Wires the toolbar button up to the options page. */
export function registerBackground() {
  browser.action.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
  });
}
