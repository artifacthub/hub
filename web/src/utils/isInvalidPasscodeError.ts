import { Error, ErrorKind } from '../types';

// Message the hub sends when the two-factor authentication code provided is
// not valid (errInvalidTFAPasscode in internal/user/manager.go)
const INVALID_PASSCODE_MESSAGE = 'invalid input: invalid passcode';

// Checks if the error provided means that the two-factor authentication code
// sent (from an authenticator app or a recovery code) was not valid
const isInvalidPasscodeError = (err: Error): boolean =>
  err.kind === ErrorKind.Other && err.message === INVALID_PASSCODE_MESSAGE;

export default isInvalidPasscodeError;
