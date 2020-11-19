import cutString from './cutString';

interface Test {
  input: string;
  output: string;
}

const tests: Test[] = [
  { input: '', output: '' },
  { input: '-', output: '-' },
  { input: '1.2.3', output: '1.2.3' },
  { input: '11.2.3', output: '11.2.3' },
  { input: '11.22.3', output: '11.22.3' },
  { input: '11.22.33', output: '11.22.33' },
  { input: '0.0.3-v1.2.3.final', output: '0.0.3-v1.2...' },
  { input: '0.3.1-mater', output: '0.3.1-mate...' },
  { input: '1.3.2-rc.1', output: '1.3.2-rc.1' }, // 10 characters
];

describe('cutString', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct string', () => {
      const actual = cutString(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
