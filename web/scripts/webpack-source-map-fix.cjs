const Module = require('module');
const targetPath = require.resolve('react-scripts/config/webpack.config');
const originalLoad = Module._load;
const originalResolve = Module._resolveFilename;

function wrapFactory(factory) {
  const wrapped = (...args) => {
    const config = factory(...args);
    const rules = Array.isArray(config?.module?.rules) ? config.module.rules : [];
    const targetPattern = /node_modules[\\/]+react-diff-view/;

    for (const rule of rules) {
      const useField = rule?.use;
      if (useField) {
        const entries = Array.isArray(useField) ? useField : [useField];
        const hasSourceMapLoader = entries.some((entry) => {
          if (!entry) {
            return false;
          }
          const loader = typeof entry === 'string' ? entry : entry.loader;
          return typeof loader === 'string' && loader.includes('source-map-loader');
        });

        if (hasSourceMapLoader) {
          if (Array.isArray(rule.exclude)) {
            const alreadyExcluded = rule.exclude.some((item) => item?.toString() === targetPattern.toString());
            if (!alreadyExcluded) {
              rule.exclude.push(targetPattern);
            }
          } else if (rule.exclude) {
            rule.exclude = [rule.exclude, targetPattern];
          } else {
            rule.exclude = [targetPattern];
          }
          continue;
        }
      }

      const loader = rule?.loader;
      if (typeof loader === 'string' && loader.includes('source-map-loader')) {
        if (Array.isArray(rule.exclude)) {
          const alreadyExcluded = rule.exclude.some((item) => item?.toString() === targetPattern.toString());
          if (!alreadyExcluded) {
            rule.exclude.push(targetPattern);
          }
        } else if (rule.exclude) {
          rule.exclude = [rule.exclude, targetPattern];
        } else {
          rule.exclude = [targetPattern];
        }
      }
    }

    return config;
  };

  return Object.assign(wrapped, factory);
}

Module._load = function patchedLoad(request, parent, isMain) {
  const resolved = originalResolve.call(Module, request, parent, isMain);
  if (resolved === targetPath) {
    const factory = originalLoad.call(Module, request, parent, isMain);
    if (factory?.__sourceMapFixApplied) {
      return factory;
    }
    const wrapped = wrapFactory(factory);
    wrapped.__sourceMapFixApplied = true;
    const cachedModule = Module._cache?.[resolved];
    if (cachedModule) {
      cachedModule.exports = wrapped;
    }
    return wrapped;
  }
  return originalLoad.call(Module, request, parent, isMain);
};
