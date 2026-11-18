import { ChangeEvent, useState } from 'react';

import API from '../../api';
import { ErrorKind } from '../../types';
import compoundErrorMessage from '../../utils/compoundErrorMessage';
import getRetryAfterText from '../../utils/getRetryAfterText';
import InputField from '../common/InputField';

interface Props {
  onSuccess: () => void;
  onError: (message: string) => void;
  expiredHint: string;
  tooManyHint?: string;
}

// Appends the hint provided, if any, to the text
const withHint = (text: string, hint?: string): string => (hint ? `${text} ${hint}` : text);

const ApproveSessionForm = (props: Props) => {
  const [passcode, setPasscode] = useState<string>('');
  const [isApprovingSession, setIsApprovingSession] = useState<boolean>(false);

  const onPasscodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPasscode(e.target.value);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getErrorMessage = (err: any): string => {
    switch (err.kind) {
      case ErrorKind.TooManyAttempts:
        return withHint(
          `Too many incorrect codes for this account. Please try again in ${getRetryAfterText(
            err.retryAfter
          )}, or enter one of your recovery codes.`,
          props.tooManyHint
        );
      case ErrorKind.TooManyRequests:
        return `Too many requests. Please try again in ${getRetryAfterText(err.retryAfter)}.`;
      case ErrorKind.Unauthorized:
        return withHint('This sign-in has expired.', props.expiredHint);
      default:
        return compoundErrorMessage(err, 'An error occurred signing in');
    }
  };

  async function approveSession() {
    try {
      setIsApprovingSession(true);
      await API.approveSession(passcode);
      setIsApprovingSession(false);
      props.onSuccess();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsApprovingSession(false);
      props.onError(getErrorMessage(err));
    }
  }

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
          invalidText={{
            default: 'This field is required',
          }}
          validateOnBlur
          required
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
      </div>
    </div>
  );
};

export default ApproveSessionForm;
