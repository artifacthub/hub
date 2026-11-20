import { Error, ErrorKind } from '../types';
import isInvalidPasscodeError from './isInvalidPasscodeError';

interface Test {
  input: Error;
  output: boolean;
}

const tests: Test[] = [
  { input: { kind: ErrorKind.Other, message: 'invalid input: invalid passcode' }, output: true },
  { input: { kind: ErrorKind.Other, message: 'invalid input: passcode not provided' }, output: false },
  { input: { kind: ErrorKind.Other }, output: false },
  { input: { kind: ErrorKind.Unauthorized, message: 'invalid input: invalid passcode' }, output: false },
  { input: { kind: ErrorKind.TooManyAttempts, message: 'too many attempts, please try again later' }, output: false },
];

describe('isInvalidPasscodeError', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct value', () => {
      const actual = isInvalidPasscodeError(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
