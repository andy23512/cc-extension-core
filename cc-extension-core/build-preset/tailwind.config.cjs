const path = require("path");

// Core ships compiled JS, so Tailwind has to scan `dist/` to find the utility
// classes used by the shared components. `node_modules` is excluded from
// Tailwind's automatic detection, hence the explicit entry.
const coreDist = path.join(__dirname, "..", "dist");

module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./public/index.html",
    path.join(coreDist, "**/*.js"),
  ],
  plugins: [],
};
