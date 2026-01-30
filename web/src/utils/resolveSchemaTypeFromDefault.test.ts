import resolveSchemaTypeFromDefault from './resolveSchemaTypeFromDefault';

interface Test {
  typeOptions: string[];
  defaultValue: unknown;
  result: string | undefined;
}

const tests: Test[] = [
  // String type resolution
  { typeOptions: ['string', 'integer'], defaultValue: 'hello', result: 'string' },

  // Integer type resolution
  { typeOptions: ['string', 'integer'], defaultValue: 2, result: 'integer' },
  { typeOptions: ['number', 'integer'], defaultValue: 5, result: 'integer' },

  // Number type resolution
  { typeOptions: ['string', 'number'], defaultValue: 2.5, result: 'number' },
  { typeOptions: ['integer', 'number'], defaultValue: 3.14, result: 'number' },

  // Boolean type resolution
  { typeOptions: ['boolean', 'string'], defaultValue: true, result: 'boolean' },
  { typeOptions: ['boolean', 'string'], defaultValue: false, result: 'boolean' },

  // Array type resolution
  { typeOptions: ['array', 'object'], defaultValue: [1, 2, 3], result: 'array' },
  { typeOptions: ['array', 'object'], defaultValue: [], result: 'array' },

  // Object type resolution
  { typeOptions: ['object', 'null'], defaultValue: { key: 'value' }, result: 'object' },
  { typeOptions: ['object', 'null'], defaultValue: {}, result: 'object' },

  // Null type resolution
  { typeOptions: ['string', 'null'], defaultValue: null, result: 'null' },

  // Fallback behavior - undefined default returns first option
  { typeOptions: ['string', 'integer'], defaultValue: undefined, result: 'string' },
  { typeOptions: ['integer', 'string'], defaultValue: undefined, result: 'integer' },

  // Fallback behavior - no matching type returns first option
  { typeOptions: ['string', 'integer'], defaultValue: true, result: 'string' },
  { typeOptions: ['object', 'array'], defaultValue: 'text', result: 'object' },
  { typeOptions: [], defaultValue: 'text', result: undefined },
];

describe('resolveSchemaTypeFromDefault', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct type', () => {
      const actual = resolveSchemaTypeFromDefault(tests[i].typeOptions, tests[i].defaultValue);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
