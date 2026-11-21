import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SRC, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  main: string;
  module: string;
  types: string;
  files: string[];
  exports: Record<string, string | Record<string, string>>;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  peerDependenciesMeta: Record<string, { optional: boolean }>;
};

function sourceFiles(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.(spec|test)\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Every `from "x"` / `import "x"` / `export … from "x"` specifier in a file. */
function specifiers(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map((m) => m[1]);
}

const packageName = (specifier: string) =>
  specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];

describe("package exports", () => {
  it("lists the entry points downstream extensions use", () => {
    expect(Object.keys(pkg.exports).sort()).toEqual(
      [".", "./background", "./package.json", "./postcss", "./style.css", "./tailwind", "./webpack"].sort(),
    );
  });

  it("points every non-build target at a file that is really there", () => {
    const targets: string[] = [];
    for (const value of Object.values(pkg.exports)) {
      if (typeof value === "string") targets.push(value);
      else targets.push(value["@cc-extension-core/source"]);
    }
    for (const target of targets.filter(Boolean)) {
      expect(existsSync(resolve(ROOT, target)), target).toBe(true);
    }
  });

  it("keeps the source condition on the two code entries, so linked extensions can read src/", () => {
    const main = pkg.exports["."] as Record<string, string>;
    const background = pkg.exports["./background"] as Record<string, string>;
    expect(main["@cc-extension-core/source"]).toBe("./src/index.ts");
    expect(background["@cc-extension-core/source"]).toBe("./src/background.ts");
  });

  it("points the built entries at dist, with matching types, and import equal to default", () => {
    for (const [key, name] of [[".", "index"], ["./background", "background"]] as const) {
      const entry = pkg.exports[key] as Record<string, string>;
      expect(entry.import).toBe(`./dist/${name}.js`);
      expect(entry.default).toBe(entry.import);
      expect(entry.types).toBe(`./dist/${name}.d.ts`);
    }
    expect(pkg.main).toBe("./dist/index.js");
    expect(pkg.module).toBe(pkg.main);
    expect(pkg.types).toBe("./dist/index.d.ts");
  });

  it("publishes the folders the exports and the Tailwind preset need", () => {
    expect(pkg.files).toEqual(expect.arrayContaining(["dist", "style", "build-preset"]));
  });
});

describe("dependencies", () => {
  it("declares every package the source imports as a dependency or a peer", () => {
    const declared = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]);
    const missing = new Set<string>();
    for (const file of sourceFiles()) {
      for (const spec of specifiers(file)) {
        if (spec.startsWith(".") || spec.startsWith("node:")) continue;
        if (!declared.has(packageName(spec))) missing.add(`${packageName(spec)} (${relative(SRC, file)})`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("asks the host extension for React, MUI, Zustand and the CC library (peers, not bundled copies)", () => {
    for (const name of ["react", "react-dom", "@mui/material", "zustand", "tangent-cc-lib", "webextension-polyfill", "react-moveable", "classnames"]) {
      expect(pkg.peerDependencies, name).toHaveProperty(name);
    }
  });

  it("makes the build-only peers optional, since only the webpack preset uses them", () => {
    for (const name of ["copy-webpack-plugin", "webpack-livereload-plugin", "webpack-merge"]) {
      expect(pkg.peerDependenciesMeta[name]).toEqual({ optional: true });
    }
  });
});

describe("the background entry", () => {
  /** Every module reachable from `file` through relative imports. */
  function reachable(file: string, seen = new Set<string>()): Set<string> {
    if (seen.has(file)) return seen;
    seen.add(file);
    for (const spec of specifiers(file).filter((s) => s.startsWith("."))) {
      const base = resolve(dirname(file), spec.replace(/\.js$/, ""));
      const target = [".ts", ".tsx"].map((ext) => base + ext).find(existsSync);
      if (target) reachable(target, seen);
    }
    return seen;
  }

  it("reaches no React, MUI or component code (the service worker stays a few KB)", () => {
    const modules = [...reachable(join(SRC, "background.ts"))];
    const bare = modules.flatMap(specifiers).filter((s) => !s.startsWith("."));
    expect([...new Set(bare)]).toEqual(["webextension-polyfill"]);
    expect(modules.map((m) => relative(SRC, m)).sort()).toEqual(["background.ts", "lib/mount/register-background.ts"]);
  });

  it("is the one thing the main entry cannot be used for: the main entry does pull React in", () => {
    const bare = [...reachable(join(SRC, "index.ts"))].flatMap(specifiers).filter((s) => !s.startsWith("."));
    expect(bare).toContain("react");
    expect(bare).toContain("@mui/material");
  });
});

describe("theming contract", () => {
  const css = readFileSync(join(ROOT, "style/index.css"), "utf8");

  it("defines every custom property the components read, so an extension that sets none still renders", () => {
    for (const name of ["--cc-frame-color", "--cc-key-color", "--cc-symbol-color", "--cc-pointer-color", "--cc-font-family"]) {
      expect(css, name).toMatch(new RegExp(`${name}\\s*:`));
    }
  });

  it("does not leave a component reading a property the stylesheet never defines", () => {
    const defined = new Set([...css.matchAll(/(--cc-[a-z-]+)\s*:/g)].map((m) => m[1]));
    for (const file of sourceFiles()) {
      for (const match of readFileSync(file, "utf8").matchAll(/(--cc-[a-z-]+)/g)) {
        expect(defined.has(match[1]), `${match[1]} in ${relative(SRC, file)}`).toBe(true);
      }
    }
  });
});
