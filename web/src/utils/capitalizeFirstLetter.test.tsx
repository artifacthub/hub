import capitalizeFirstLetter from './capitalizeFirstLetter';

interface Test {
  input: string;
  output: string;
}

const tests: Test[] = [
  { input: '', output: '' },
  { input: 'this is a sample', output: 'This is a sample' },
  { input: 'this is not going to change', output: 'This is not going to change' },
  { input: 'ALL IN CAPITAL', output: 'ALL IN CAPITAL' },
  { input: 'A Different Case', output: 'A Different Case' },
  { input: '  another case  ', output: 'Another case' },
];

describe('capitalizeFirstLetter', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct string', () => {
      const actual = capitalizeFirstLetter(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
