import trimPrefix from './trimPrefix';

interface Test {
  input: {
    prefix: string;
    str: string;
  };
  result: string;
}

const tests: Test[] = [
  {
    input: {
      prefix: '',
      str: 'test',
    },
    result: 'test',
  },
  {
    input: {
      prefix: 'ex-',
      str: 'ex-test',
    },
    result: 'test',
  },
  {
    input: {
      prefix: 'https://',
      str: 'https://test.com',
    },
    result: 'test.com',
  },
];

describe('trimPrefix', () => {
  for (let i = 0; i < tests.length; i++) {
    it('trims prefix', () => {
      const actual = trimPrefix(tests[i].input.prefix, tests[i].input.str);
      expect(actual).toBe(tests[i].result);
    });
  }
});
