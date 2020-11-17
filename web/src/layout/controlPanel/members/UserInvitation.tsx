import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { MdClose, MdDone } from 'react-icons/md';
import { useHistory } from 'react-router-dom';

import { API } from '../../../api';
import { ErrorKind } from '../../../types';
import Loading from '../../common/Loading';
import Modal from '../../common/Modal';
import styles from './UserInvitation.module.css';

interface Props {
  orgToConfirm?: string;
}

const UserInvitation = (props: Props) => {
  const [orgToConfirm] = useState(props.orgToConfirm);
  const [isAccepting, setIsAccepting] = useState(false);
  const [validInvitation, setValidInvitation] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const history = useHistory();

  useEffect(() => {
    async function confirmOrganizationMembership() {
      setIsAccepting(true);
      try {
        await API.confirmOrganizationMembership(orgToConfirm!);
        setValidInvitation(true);
      } catch (err) {
        let error = !isUndefined(err.message)
          ? err.message
          : 'An error occurred accepting your invitation, please contact us about this issue.';
        if (err.kind === ErrorKind.Unauthorized) {
          error =
            'Please sign in to accept the invitation to join the organization. You can accept it from the Control Panel, in the organizations tab, or from the link you received in the invitation email.';
        }
        setApiError(error);
        setValidInvitation(false);
      } finally {
        setIsAccepting(false);
      }
    }

    if (!isUndefined(orgToConfirm)) {
      history.replace({
        pathname: '/',
        search: '',
      });
      confirmOrganizationMembership();
    }
  }, [orgToConfirm, history]);

  if (isUndefined(orgToConfirm)) return null;

  return (
    <Modal
      data-testid="userInvitationModal"
      header={<div className="h6 text-uppercase mb-0 flex-grow-1">Membership confirmation</div>}
      disabledClose={isAccepting}
      modalClassName={styles.modal}
      open={!isUndefined(orgToConfirm)}
    >
      <div
        className={`d-flex flex-column h-100 w-100 px-3 align-items-center justify-content-center text-center position-relative ${styles.content}`}
      >
        {isAccepting ? (
          <>
            <Loading className={styles.loading} spinnerClassName="mt-0" />
            <small className="text-muted">Your are accepting the invitation...</small>
          </>
        ) : (
          <>
            {validInvitation ? (
              <>
                <MdDone className="display-4 text-success mb-4" />
                You have accepted the invitation to join the organization.
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

export default UserInvitation;
