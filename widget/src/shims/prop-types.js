const createValidator = () => {
  const validator = (...args) => {
    void args;
    return validator;
  };
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

const checkPropTypes = () => null;
const resetWarningCache = () => null;

PropTypes.checkPropTypes = checkPropTypes;
PropTypes.resetWarningCache = resetWarningCache;

export { checkPropTypes, PropTypes, resetWarningCache };
export default PropTypes;
