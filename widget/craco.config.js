module.exports = {
  babel: {
    presets: [],
    plugins: [['babel-plugin-styled-components', { displayName: true }]],
    loaderOptions: (babelLoaderOptions) => {
      return babelLoaderOptions;
    },
  },
  webpack: {
    configure: {
      output: {
        filename: 'static/js/artifacthub-widget.js',
      },
      optimization: {
        runtimeChunk: false,
        splitChunks: {
          cacheGroups: {
            default: false,
            vendors: false,
            // vendor chunk
          },
        },
      },
    },
  },
  eslint: {
    enable: false
  },
};
