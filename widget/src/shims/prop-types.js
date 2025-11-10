const createChainedValidator = () => {
  const validator = (...args) => {
    void args;
    return validator;
  };
  validator.isRequired = validator;
  return validator;
};

const createFactory = () => {
  const validator = createChainedValidator();
  const factory = (...args) => {
    void args;
    return validator;
  };
  factory.isRequired = validator;
  return factory;
};

const checkPropTypes = () => null;
const resetWarningCache = () => null;

const PropTypes = {
  checkPropTypes,
  resetWarningCache,
};

const simpleValidators = [
  'any',
  'array',
  'bool',
  'element',
  'elementType',
  'func',
  'node',
  'number',
  'object',
  'string',
  'symbol',
];

simpleValidators.forEach((prop) => {
  PropTypes[prop] = createChainedValidator();
});

const factoryValidators = ['arrayOf', 'objectOf', 'oneOf', 'oneOfType', 'shape', 'exact', 'instanceOf'];

factoryValidators.forEach((prop) => {
  PropTypes[prop] = createFactory();
});

PropTypes.PropTypes = PropTypes;
PropTypes.default = PropTypes;

export { checkPropTypes, PropTypes, resetWarningCache };
export default PropTypes;
