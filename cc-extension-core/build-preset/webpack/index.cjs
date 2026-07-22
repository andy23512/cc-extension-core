const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { merge } = require("webpack-merge");
const LiveReloadPlugin = require("webpack-livereload-plugin");

/**
 * The webpack config shared by every CC extension.
 *
 * @param {object} options
 * @param {string} options.extensionRoot Absolute path to the extension repo
 *   root — the directory holding `src/`, `public/` and `dist/`.
 */
function createCommonConfig({ extensionRoot }) {
  const srcDir = path.join(extensionRoot, "src");

  return {
    entry: {
      options: path.join(srcDir, "options.tsx"),
      background: path.join(srcDir, "background.ts"),
      content_script: path.join(srcDir, "content_script.tsx"),
    },
    output: {
      path: path.join(extensionRoot, "dist/js"),
      filename: "[name].js",
    },
    optimization: {
      splitChunks: {
        name: "vendor",
        chunks(chunk) {
          return chunk.name !== "background";
        },
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.svg$/,
          loader: "raw-loader",
          options: {
            esModule: false,
          },
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader", "postcss-loader"],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          generator: {
            filename: "fonts/[name][ext]",
          },
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: ".", to: "../", context: path.join(extensionRoot, "public") },
        ],
        options: {},
      }),
    ],
  };
}

/** Development config: inline source maps and live reload. */
function createDevConfig(options) {
  return merge(createCommonConfig(options), {
    devtool: "inline-source-map",
    mode: "development",
    plugins: [
      new LiveReloadPlugin({
        appendScriptTag: true,
        protocol: "http",
        hostname: "localhost",
      }),
    ],
  });
}

/** Production config. */
function createProdConfig(options) {
  return merge(createCommonConfig(options), {
    mode: "production",
  });
}

module.exports = { createCommonConfig, createDevConfig, createProdConfig };
