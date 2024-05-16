import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useState } from 'react';
import { CgUserRemove } from 'react-icons/cg';
import { MdClose } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import alertDispatcher from '../../utils/alertDispatcher';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import styles from './AccountDeletion.module.css';

interface Props {
  code?: string | null;
}

const AccountDeletion = (props: Props) => {
  const navigate = useNavigate();
  const { ctx, dispatch } = useContext(AppCtx);
  const [code, setCode] = useState<string | undefined | null>(props.code);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [validCode, setValidCode] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    async function deleteUser() {
      setDeleting(true);
      try {
        await API.deleteUser(code!);
        setDeleting(false);
        setApiError(null);
        setValidCode(true);
      } catch {
        setDeleting(false);
        setApiError('Sorry, the code provided is not valid.');
        setValidCode(false);
      }
    }

    if (!isUndefined(ctx.user) && code) {
      navigate(
        {
          pathname: '/',
          search: '',
        },
        { replace: true }
      );
      if (isNull(ctx.user)) {
        setCode(undefined);
        alertDispatcher.postAlert({
          type: 'warning',
          message: 'Please log in to complete your account deletion process.',
        });
      } else {
        deleteUser();
      }
    }
  }, [ctx]);

  if (isUndefined(code) || isNull(code) || isUndefined(ctx.user)) return null;

  return (
    <Modal
      data-testid="accountDeletionModal"
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Account deletion</div>}
      disabledClose={deleting}
      modalClassName={styles.modal}
      open
      onClose={() => {
        setCode(undefined);
        if (validCode) {
          dispatch(signOut());
          navigate('/');
        }
      }}
    >
      <div
        className={`d-flex flex-column h-100 w-100 px-3 align-items-center justify-content-center text-center position-relative ${styles.content}`}
      >
        {deleting ? (
          <>
            <Loading className="position-relative" spinnerClassName="mt-0" />
            <small className="text-muted">We are deleting your account...</small>
          </>
        ) : (
          <>
            {validCode ? (
              <>
                <CgUserRemove className="display-4 text-dark mb-4" />
                You account has been successfully deleted. We're sorry to see you go, but you are always welcome back.
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

export default AccountDeletion;
