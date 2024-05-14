import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';
import { MdClose, MdDone } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../../api';
import { ErrorKind } from '../../../types';
import Loading from '../../common/Loading';
import Modal from '../../common/Modal';
import styles from './UserInvitation.module.css';

interface Props {
  orgToConfirm?: string | null;
}

const UserInvitation = (props: Props) => {
  const [orgToConfirm] = useState(props.orgToConfirm);
  const [isAccepting, setIsAccepting] = useState(false);
  const [validInvitation, setValidInvitation] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function confirmOrganizationMembership() {
      setIsAccepting(true);
      try {
        await API.confirmOrganizationMembership(orgToConfirm!);
        setValidInvitation(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
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

    if (props.orgToConfirm) {
      navigate(
        {
          pathname: '/',
          search: '',
        },
        { replace: true }
      );
      confirmOrganizationMembership();
    }
  }, [orgToConfirm]);

  if (isUndefined(orgToConfirm) || isNull(props.orgToConfirm)) return null;

  return (
    <Modal
      data-testid="userInvitationModal"
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Membership confirmation</div>}
      disabledClose={isAccepting}
      open
    >
      <div
        className={`d-flex flex-column h-100 w-100 px-3 align-items-center justify-content-center text-center position-relative ${styles.content}`}
      >
        {isAccepting ? (
          <>
            <Loading className="position-relative" spinnerClassName="mt-0" />
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
