import { Error, ErrorKind } from '../types';
import compoundErrorMessage from './compoundErrorMessage';

interface Test {
  err: Error;
  input: string;
  output: string;
}

const tests: Test[] = [
  {
    err: { kind: ErrorKind.Other },
    input: 'An error occurred doing this',
    output: 'An error occurred doing this, please try again later.',
  },
  {
    err: { kind: ErrorKind.Other, message: 'custom error' },
    input: 'An error occurred doing this',
    output: 'An error occurred doing this: custom error',
  },
];

describe('compoundErrorMessage', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct string', () => {
      const actual = compoundErrorMessage(tests[i].err, tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
