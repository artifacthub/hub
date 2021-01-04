import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useRef, useState } from 'react';
import { FaEnvelope } from 'react-icons/fa';

import Modal from '../common/Modal';
import CreateAnAccount from './CreateAnAccount';
import OAuth from './OAuth';
import styles from './SignUp.module.css';

interface Loading {
  status: boolean;
  type?: 'log' | 'google' | 'github' | 'oidc';
}

interface Props {
  openSignUp: boolean;
  setOpenSignUp: React.Dispatch<React.SetStateAction<boolean>>;
}

const SignUp = (props: Props) => {
  const form = useRef<HTMLFormElement>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeSignUp, setActiveSignUp] = useState(false);
  const [successNewAccount, setSuccessNewAccount] = useState(false);
  const [isLoading, setIsLoading] = useState<Loading>({ status: false });

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onCloseModal = () => {
    props.setOpenSignUp(false);
  };

  const submitForm = () => {
    if (form.current) {
      form.current.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  };

  const closeButton = (
    <button className="btn btn-secondary" type="button" disabled={isLoading.status} onClick={submitForm}>
      {!isUndefined(isLoading.type) && isLoading.type === 'log' ? (
        <>
          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
          <span className="ml-2">Signing up...</span>
        </>
      ) : (
        <>Sign up</>
      )}
    </button>
  );

  return (
    <Modal
      header={<div className="h3 m-2 flex-grow-1">Sign up</div>}
      modalClassName={styles.modal}
      open={props.openSignUp}
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
      closeButton={!successNewAccount && activeSignUp ? closeButton : undefined}
    >
      {activeSignUp ? (
        <CreateAnAccount
          ref={form}
          setApiError={setApiError}
          apiError={apiError}
          success={successNewAccount}
          setSuccess={setSuccessNewAccount}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      ) : (
        <div className="my-auto">
          <div className="h5 mb-5 text-center">Create your account using your email</div>

          <button
            data-testid="signUpBtn"
            type="button"
            onClick={() => setActiveSignUp(true)}
            className="btn btn-outline-secondary btn-block"
            disabled={isLoading.status}
          >
            <div className="d-flex align-items-center">
              <FaEnvelope />
              <div className="flex-grow-1 text-center">Sign up</div>
            </div>
          </button>

          <OAuth separatorClassName="my-5" isLoading={isLoading} setIsLoading={setIsLoading} />
        </div>
      )}
    </Modal>
  );
};

export default SignUp;
