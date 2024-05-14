import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';
import { MdClose, MdDone } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../api';
import getMetaTag from '../../utils/getMetaTag';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import styles from './UserConfirmation.module.css';

interface Props {
  emailCode?: string | null;
}

const UserConfirmation = (props: Props) => {
  const [emailCode] = useState(props.emailCode);
  const [verifying, setVerifying] = useState(false);
  const [validEmail, setValidEmail] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();
  const siteName = getMetaTag('siteName');

  useEffect(() => {
    async function fetchEmailConfirmation() {
      setVerifying(true);
      try {
        await API.verifyEmail(emailCode!);
        setValidEmail(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
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

    if (emailCode) {
      navigate(
        {
          pathname: '/',
          search: '',
        },
        { replace: true }
      );
      fetchEmailConfirmation();
    }
  }, [emailCode]);

  if (isUndefined(emailCode) || isNull(emailCode)) return null;

  return (
    <Modal
      data-testid="userConfirmationModal"
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Email confirmation</div>}
      disabledClose={verifying}
      modalClassName={styles.modal}
      open
    >
      <div
        className={`d-flex flex-column h-100 w-100 px-3 align-items-center justify-content-center text-center position-relative ${styles.content}`}
      >
        {verifying ? (
          <>
            <Loading className="position-relative" spinnerClassName="mt-0" />
            <small className="text-muted">We are verifying your email...</small>
          </>
        ) : (
          <>
            {validEmail ? (
              <>
                <MdDone className="display-4 text-success mb-4" />
                You email has been verified! Please, login to {siteName}.
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
