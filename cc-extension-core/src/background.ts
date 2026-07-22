/**
 * Entry point for the extension's background service worker.
 *
 * Deliberately separate from the package's main entry: importing the barrel
 * here would drag React, MUI and every component into the service worker
 * bundle, which is otherwise a few hundred bytes.
 */
export { registerBackground } from "./lib/mount/register-background.js";
