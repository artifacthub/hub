import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import API from '../../api';
import { ErrorKind } from '../../types';
import compoundErrorMessage from '../../utils/compoundErrorMessage';
import getRetryAfterText from '../../utils/getRetryAfterText';
import isInvalidPasscodeError from '../../utils/isInvalidPasscodeError';
import InputField from '../common/InputField';

interface Props {
  onSuccess: () => void;
  onError: (message: string) => void;
  expiredHint: string;
  // Shown below the form once too many incorrect codes have been entered
  tooManyHint?: string;
}

const ApproveSessionForm = (props: Props) => {
  const [passcode, setPasscode] = useState<string>('');
  const [isApprovingSession, setIsApprovingSession] = useState<boolean>(false);
  const [tooManyAttempts, setTooManyAttempts] = useState<boolean>(false);
  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const onPasscodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPasscode(e.target.value);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getErrorMessage = (err: any): string => {
    switch (err.kind) {
      case ErrorKind.TooManyAttempts:
        return `Too many incorrect codes for this account. Please try again in ${getRetryAfterText(
          err.retryAfter
        )}, or enter one of your recovery codes.`;
      case ErrorKind.TooManyRequests:
        return `Too many requests. Please try again in ${getRetryAfterText(err.retryAfter)}.`;
      case ErrorKind.Unauthorized:
        return `This sign-in has expired. ${props.expiredHint}`;
      default:
        if (isInvalidPasscodeError(err)) {
          return 'Incorrect code. Please check it and try again.';
        }
        return compoundErrorMessage(err, 'An error occurred signing in');
    }
  };

  async function approveSession() {
    if (passcode === '' || isApprovingSession) return;
    try {
      setIsApprovingSession(true);
      await API.approveSession(passcode);
      setIsApprovingSession(false);
      props.onSuccess();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // The error is not reported once the form is gone (the user went back)
      if (!isMounted.current) return;
      setIsApprovingSession(false);
      if (err.kind === ErrorKind.TooManyAttempts) {
        setTooManyAttempts(true);
      }
      props.onError(getErrorMessage(err));
    }
  }

  const handleOnReturnKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !event.repeat) {
      approveSession();
    }
  };

  return (
    <div className="flex-grow-1 w-100 d-flex align-items-center">
      <div className="w-100">
        <InputField
          type="text"
          label="Authentication code"
          name="passcode"
          autoComplete="off"
          value={passcode}
          onChange={onPasscodeChange}
          onKeyDown={handleOnReturnKeyDown}
          invalidText={{
            default: 'This field is required',
          }}
          validateOnBlur
          required
          autoFocus
        />

        <button
          onClick={approveSession}
          className="btn btn-success btn-sm text-uppercase mt-3"
          disabled={passcode === '' || isApprovingSession}
          aria-label="Verify passcode"
        >
          {isApprovingSession ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ms-2">Verifying...</span>
            </>
          ) : (
            <>Verify</>
          )}
        </button>

        {tooManyAttempts && props.tooManyHint && <small className="d-block text-muted mt-4">{props.tooManyHint}</small>}
      </div>
    </div>
  );
};

export default ApproveSessionForm;
