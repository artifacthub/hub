import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { MdClose, MdDone } from 'react-icons/md';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import styles from './UserConfirmation.module.css';

interface Props {
  emailCode?: string;
}

const UserConfirmation = (props: Props) => {
  const [emailCode] = useState(props.emailCode);
  const [verifying, setVerifying] = useState(false);
  const [validEmail, setValidEmail] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const history = useHistory();

  useEffect(() => {
    async function fetchEmailConfirmation() {
      setVerifying(true);
      try {
        await API.verifyEmail(emailCode!);
        setValidEmail(true);
      } catch (err) {
        let error = 'An error occurred verifying your email, please contact us about this issue.';
        if (!isUndefined(err.message)) {
          error = `Sorry, ${err.message}`;
        }
        setApiError(error);
        setValidEmail(false);
      } finally {
        setVerifying(false);
      }
    }

    if (!isUndefined(emailCode)) {
      history.replace({
        pathname: '/',
        search: '',
      });
      fetchEmailConfirmation();
    }
  }, [emailCode, history]);

  if (isUndefined(emailCode)) return null;

  return (
    <Modal
      data-testid="userConfirmationModal"
      header={<div className="h6 text-uppercase mb-0 flex-grow-1">Email confirmation</div>}
      disabledClose={verifying}
      modalClassName={styles.modal}
      open={!isUndefined(emailCode)}
    >
      <div
        className={`d-flex flex-column h-100 w-100 px-3 align-items-center justify-content-center text-center position-relative ${styles.content}`}
      >
        {verifying ? (
          <>
            <Loading className={styles.loading} spinnerClassName="mt-0" />
            <small className="text-muted">We are verifying your email...</small>
          </>
        ) : (
          <>
            {validEmail ? (
              <>
                <MdDone className="display-4 text-success mb-4" />
                You email has been verified! Please, login to Artifact Hub.
              </>
            ) : (
              <>
                <MdClose className="display-4 text-danger mb-4" />
                {apiError}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default UserConfirmation;
