import checkIfPropIsRequiredInSchema from './checkIfPropIsRequiredInSchema';

interface Test {
  input: {
    schema?: string[] | boolean;
    value: string;
  };
  output: boolean;
}

const tests: Test[] = [
  { input: { value: 'test' }, output: false },
  { input: { value: 'test', schema: false }, output: false },
  { input: { value: 'test', schema: true }, output: true },
  { input: { value: 'test', schema: [] }, output: false },
  { input: { value: 'test', schema: ['notest', 'notest1'] }, output: false },
  { input: { value: 'test', schema: ['test', 'test1'] }, output: true },
];

describe('checkIfPropIsRequiredInSchema', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct string', () => {
      const actual = checkIfPropIsRequiredInSchema(tests[i].input.value, tests[i].input.schema);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
