const createValidator = () => {
  const validator = (..._args) => validator;
  validator.isRequired = validator;
  return validator;
};

const baseValidator = createValidator();

const PropTypes = new Proxy(baseValidator, {
  get: (_target, prop) => {
    if (prop === 'checkPropTypes' || prop === 'resetWarningCache') {
      return () => null;
    }
    if (prop === 'PropTypes' || prop === 'default') {
      return PropTypes;
    }
    if (prop === Symbol.toStringTag) {
      return 'PropTypes';
    }
    return baseValidator;
  },
  apply: () => baseValidator,
});

PropTypes.checkPropTypes = () => null;
PropTypes.resetWarningCache = () => null;

Object.defineProperty(PropTypes, '__esModule', { value: true });

module.exports = PropTypes;
module.exports.default = PropTypes;
module.exports.PropTypes = PropTypes;
module.exports.checkPropTypes = PropTypes.checkPropTypes;
module.exports.resetWarningCache = PropTypes.resetWarningCache;
