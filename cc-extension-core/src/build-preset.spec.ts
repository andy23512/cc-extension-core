import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const preset = (name: string) => require(join(ROOT, "build-preset", name));

describe("tailwind preset", () => {
  const config = preset("tailwind.config.cjs");

  it("scans the extension's own sources and page, plus core's dist", () => {
    expect(config.content).toContain("./src/**/*.{ts,tsx}");
    expect(config.content).toContain("./public/index.html");
  });

  it("scans core's compiled dist explicitly, because Tailwind skips node_modules", () => {
    const dist = config.content.find((c: string) => c.endsWith("**/*.js"));
    expect(dist).toBe(join(ROOT, "dist", "**/*.js"));
  });

  it("adds no plugins of its own", () => {
    expect(config.plugins).toEqual([]);
  });
});

describe("postcss preset", () => {
  it("runs Tailwind then autoprefixer", () => {
    const config = preset("postcss.config.cjs");
    expect(Object.keys(config.plugins)).toEqual(["@tailwindcss/postcss", "autoprefixer"]);
  });
});

describe("webpack preset", () => {
  const { createCommonConfig, createDevConfig, createProdConfig } = preset("webpack/index.cjs");
  const extensionRoot = "/work/my-extension";

  it("builds the three entry points from the extension's src folder", () => {
    const config = createCommonConfig({ extensionRoot });
    expect(config.entry).toEqual({
      options: "/work/my-extension/src/options.tsx",
      background: "/work/my-extension/src/background.ts",
      content_script: "/work/my-extension/src/content_script.tsx",
    });
  });

  it("writes to dist/js with the entry name as the file name", () => {
    const config = createCommonConfig({ extensionRoot });
    expect(config.output).toEqual({ path: "/work/my-extension/dist/js", filename: "[name].js" });
  });

  it("splits shared code into a vendor chunk for every entry except background", () => {
    const { splitChunks } = createCommonConfig({ extensionRoot }).optimization;
    expect(splitChunks.name).toBe("vendor");
    expect(splitChunks.chunks({ name: "options" })).toBe(true);
    expect(splitChunks.chunks({ name: "content_script" })).toBe(true);
    expect(splitChunks.chunks({ name: "background" })).toBe(false);
  });

  it("handles ts, tsx, svg, css and font files, and skips node_modules for TypeScript", () => {
    const rules = createCommonConfig({ extensionRoot }).module.rules;
    const byTest = (file: string) => rules.find((r: { test: RegExp }) => r.test.test(file));
    expect(byTest("a.ts").use).toBe("ts-loader");
    expect(byTest("a.tsx").use).toBe("ts-loader");
    expect(byTest("a.tsx").exclude.test("/x/node_modules/y.tsx")).toBe(true);
    expect(byTest("a.svg").loader).toBe("raw-loader");
    expect(byTest("a.svg").options).toEqual({ esModule: false });
    expect(byTest("a.css").use).toEqual(["style-loader", "css-loader", "postcss-loader"]);
    for (const ext of ["woff", "woff2", "eot", "ttf", "otf", "WOFF2"]) {
      expect(byTest(`font.${ext}`).generator.filename).toBe("fonts/[name][ext]");
    }
    expect(byTest("a.png")).toBeUndefined();
  });

  it("resolves .ts, .tsx and .js", () => {
    expect(createCommonConfig({ extensionRoot }).resolve.extensions).toEqual([".ts", ".tsx", ".js"]);
  });

  it("copies the extension's public folder next to the built js (one folder up)", () => {
    const [copy] = createCommonConfig({ extensionRoot }).plugins;
    expect(copy.constructor.name).toBe("CopyPlugin");
    expect(copy.patterns).toEqual([{ from: ".", to: "../", context: "/work/my-extension/public" }]);
  });

  it("development: inline source maps, development mode and live reload", () => {
    const config = createDevConfig({ extensionRoot });
    expect(config.mode).toBe("development");
    expect(config.devtool).toBe("inline-source-map");
    expect(config.plugins.map((p: object) => p.constructor.name)).toEqual(["CopyPlugin", "LiveReloadPlugin"]);
    const live = config.plugins[1];
    expect(live.options).toMatchObject({ appendScriptTag: true, protocol: "http", hostname: "localhost" });
    // the common parts are kept
    expect(config.entry.options).toBe("/work/my-extension/src/options.tsx");
  });

  it("production: production mode, no source maps and no live reload", () => {
    const config = createProdConfig({ extensionRoot });
    expect(config.mode).toBe("production");
    expect(config.devtool).toBeUndefined();
    expect(config.plugins.map((p: object) => p.constructor.name)).toEqual(["CopyPlugin"]);
    expect(config.output.path).toBe("/work/my-extension/dist/js");
  });

  it("gives each call its own config (changing one does not change the next)", () => {
    const a = createCommonConfig({ extensionRoot });
    a.entry.options = "changed";
    expect(createCommonConfig({ extensionRoot }).entry.options).toBe("/work/my-extension/src/options.tsx");
  });
});
