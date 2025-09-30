const configPath = require.resolve('react-scripts/config/webpackDevServer.config');
const originalFactory = require(configPath);

function createPatchedFactory(factory) {
  const patched = (...args) => {
    const config = factory(...args);
    const { onBeforeSetupMiddleware, onAfterSetupMiddleware } = config;

    if (typeof config.https !== 'undefined') {
      config.server = config.https
        ? { type: 'https', options: config.https }
        : { type: 'http' };
      delete config.https;
    }

    if (typeof onBeforeSetupMiddleware === 'function' || typeof onAfterSetupMiddleware === 'function') {
      config.setupMiddlewares = (middlewares, devServer) => {
        if (typeof onBeforeSetupMiddleware === 'function') {
          onBeforeSetupMiddleware(devServer);
        }
        if (typeof onAfterSetupMiddleware === 'function') {
          onAfterSetupMiddleware(devServer);
        }
        return middlewares;
      };
      delete config.onBeforeSetupMiddleware;
      delete config.onAfterSetupMiddleware;
    }

    return config;
  };

  return Object.assign(patched, factory);
}

require.cache[configPath].exports = createPatchedFactory(originalFactory);
