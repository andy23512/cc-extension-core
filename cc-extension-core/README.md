# cc-extension-core

The shared runtime behind Tangent's unofficial browser extensions that display
CharaChorder device layouts on typing websites:

- [keybr-cc-extension](https://github.com/andy23512/keybr-cc-extension)
- [monkeytype-cc-extension](https://github.com/andy23512/monkeytype-cc-extension)

Everything those extensions have in common — the overlay, the layout rendering,
the options page, the settings store, and the build configuration — lives here.
An extension repo only carries what is genuinely site-specific.

## What an extension has to provide

Four things, and nothing else:

| | Where it goes |
| --- | --- |
| How to read the text the user is about to type | `readNextText` in the site config |
| Which of the site's theme variables map to ours | `src/style.css` |
| Its name and slug | the site config, and `public/manifest.json` |
| Icons and store assets | `public/` |

A complete extension entry point:

```ts
// src/site-config.ts
import { SiteConfig } from "cc-extension-core";

export const keybrSiteConfig: SiteConfig = {
  id: "keybr",
  siteName: "Keybr",
  readNextText: () => document.querySelector("…")?.textContent ?? null,
};

// src/content_script.tsx
import { mountContentScript } from "cc-extension-core";
import "./style.css";
import { keybrSiteConfig } from "./site-config";

mountContentScript(keybrSiteConfig);
```

`mountOptionsPage(config)` and `registerBackground()` cover the other two entry
points. Import `registerBackground` from `cc-extension-core/background`, not
from the package root — the root barrel pulls in React and MUI, which would
inflate the background service worker from a few KB to well over half a MB.

## Theming

Core components only ever reference semantic custom properties:

| Property | Meaning |
| --- | --- |
| `--cc-frame-color` | Keyboard frame / outline |
| `--cc-key-color` | Key fill |
| `--cc-symbol-color` | Key label |
| `--cc-pointer-color` | Highlight / active accent |
| `--cc-font-family` | Key label font |

Each extension maps them onto the host site's own variables in `src/style.css`,
so the overlay follows whatever theme the user has picked on the site:

```css
@import "tailwindcss";
@import "cc-extension-core/style.css";

:root {
  --cc-frame-color: var(--Keyboard-frame__color);
  /* … */
}
```

The defaults in `style/index.css` keep the overlay legible on a site that has
not been mapped yet.

## Build preset

The webpack, Tailwind and PostCSS configuration is shared too:

```js
// webpack/webpack.prod.js
const path = require("path");
const { createProdConfig } = require("cc-extension-core/webpack");

module.exports = createProdConfig({ extensionRoot: path.join(__dirname, "..") });
```

```js
// tailwind.config.cjs
module.exports = require("cc-extension-core/tailwind");
```

The Tailwind preset explicitly scans this package's `dist/`, because Tailwind
skips `node_modules` when detecting sources automatically — without it every
utility class used by the shared components gets tree-shaken away.

## Icons

`src/lib/model/icon.model.ts` holds `ICONS`, the single source of truth for the
Material Symbols subset the extensions bundle. A compile-time assertion fails
the build if `tangent-cc-lib` gains a key-label icon that is missing from it, so
the font subset cannot silently drift out of date.

## Development

```bash
npm install
npm run build   # emits dist/
npm test
npm run lint
```

While working on an extension against a local checkout, link it:

```json
"cc-extension-core": "link:../cc-extension-core/cc-extension-core"
```

`link:` symlinks rather than copies, so rebuilding core takes effect in the
extension immediately. Remember to rebuild core (`npm run build`) after
changing it — the extensions consume `dist/`, not `src/`.

## Disclaimer

This package is not affiliated, associated, authorized, endorsed by, or in any
way officially connected with CharaChorder, Keybr or Monkeytype.
