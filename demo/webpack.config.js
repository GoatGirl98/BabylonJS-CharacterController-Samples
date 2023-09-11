var fs = require("fs");
var path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
var webpack = require("webpack");

module.exports = (env, argv) => {
  return {
    mode: "development",
    entry: "./src/CharacterController.ts",
    devtool: "source-map",
    devServer: {
      // contentBase: "/tst",
      publicPath: "/dist",
      host: "0.0.0.0",
      port: 443,
      disableHostCheck:false,
      allowedHosts : ['testgpu.dev', 'localhost'],
      https: {
        key: fs.readFileSync(path.resolve("./https/test_gpu_dev.key")),
        cert:fs.readFileSync(path.resolve("./https/test_gpu_dev.crt")),
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: argv.mode === "production" ? "CharacterController.js" : "CharacterController.max.js",
      libraryTarget: "umd",
    },
    externals: {
      babylonjs: {
        commonjs: "babylonjs",
        commonjs2: "babylonjs",
        amd: "babylonjs",
        root: "BABYLON",
      },
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          sourceMap: true, // Must be set to true if using source-maps in production
          terserOptions: {
            // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
            ecma: undefined,
            mangle: {
              // mangle options
              properties: {
                // mangle property options
                //mangle all variables starting with underscore "_"
                regex: /^_/,
              },
            },
          },
        }),
      ],
    },
  };
};
