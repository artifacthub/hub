module.exports = {
  babel: {
    presets: [],
    plugins: [
        ["babel-plugin-styled-components", { "displayName": true }]
    ],
    loaderOptions: {},
    loaderOptions: (babelLoaderOptions) => { return babelLoaderOptions; }
  },
  webpack: {
    configure: {
      output: {
        filename: 'static/js/artifacthub-widget.js',
      },
      optimization: {
        runtimeChunk: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // vendor chunk
          },
        },
      },
    }
  }
}
