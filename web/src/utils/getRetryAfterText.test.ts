import getRetryAfterText from './getRetryAfterText';

interface Test {
  input?: number;
  output: string;
}

const tests: Test[] = [
  { input: undefined, output: 'a little while' },
  { input: 5, output: 'a moment' },
  { input: 6, output: 'a minute' },
  { input: 60, output: 'a minute' },
  { input: 0, output: 'a moment' },
  { input: 61, output: '2 minutes' },
  { input: 3540, output: '59 minutes' },
  { input: 3541, output: 'an hour' },
  { input: 3600, output: 'an hour' },
  { input: 3601, output: '61 minutes' },
  { input: 5399, output: '90 minutes' },
  { input: 5400, output: '2 hours' },
  { input: 10800, output: '3 hours' },
  { input: 86400, output: '24 hours' },
];

describe('getRetryAfterText', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct text', () => {
      const actual = getRetryAfterText(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
