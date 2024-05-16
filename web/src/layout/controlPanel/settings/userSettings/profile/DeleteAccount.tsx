import { ChangeEvent, useContext, useState } from 'react';
import { CgUserRemove } from 'react-icons/cg';
import { FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import API from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import InputField from '../../../../common/InputField';
import Modal from '../../../../common/Modal';
import styles from './DeleteAccount.module.css';

interface Props {
  onAuthError: () => void;
}

const DeleteAccount = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<boolean>(false);
  const [isValidInput, setIsValidInput] = useState<boolean>(false);

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsValidInput(e.target.value === ctx.user!.alias);
  };

  const onClose = () => {
    setOpenStatus(false);
    setDeleteSuccess(false);
    setIsValidInput(false);
  };

  async function registerDeleteUserCode() {
    try {
      setIsDeleting(true);
      await API.registerDeleteUserCode();
      setIsDeleting(false);
      setDeleteSuccess(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsDeleting(false);
      if (err.kind === ErrorKind.Unauthorized) {
        props.onAuthError();
      } else {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred deleting your account, please try again later.',
        });
      }
    }
  }

  return (
    <>
      <div className="mt-4 mt-md-5">
        <p className="mb-4">
          Deleting your account will also delete all the content that belongs to it (repositories, subscriptions,
          webhooks, etc), as well as all organizations where you are the only member.
        </p>

        <button
          className="btn btn-sm btn-danger"
          onClick={() => setOpenStatus(true)}
          aria-label="Open deletion account modal"
        >
          <div className="d-flex flex-row align-items-center text-uppercase">
            <FaTrashAlt className="me-2" />
            <div>Delete account</div>
          </div>
        </button>
      </div>

      <Modal
        className="d-inline-block"
        modalClassName={styles.modal}
        closeButton={
          deleteSuccess ? undefined : (
            <>
              <button
                className="btn btn-sm btn-outline-secondary text-uppercase"
                onClick={() => setOpenStatus(false)}
                aria-label="Close"
              >
                <div className="d-flex flex-row align-items-center">
                  <IoMdCloseCircle className="me-2" />
                  <span>Cancel</span>
                </div>
              </button>

              <button
                className="btn btn-sm btn-danger ms-3"
                onClick={(e) => {
                  e.preventDefault();
                  registerDeleteUserCode();
                }}
                disabled={isDeleting || !isValidInput}
                aria-label="Delete account"
              >
                <div className="d-flex flex-row align-items-center text-uppercase">
                  {isDeleting ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Deleting...</span>
                    </>
                  ) : (
                    <>
                      <FaTrashAlt className="me-2" />
                      <span>Delete account</span>
                    </>
                  )}
                </div>
              </button>
            </>
          )
        }
        header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Delete account</div>}
        onClose={onClose}
        open={openStatus}
      >
        <div className="mw-100 h-100">
          {deleteSuccess ? (
            <div className="d-flex h-100 w-100 align-items-center justify-content-center">
              <div className="alert" role="alert" aria-live="assertive" aria-atomic="true">
                <div className="d-flex flex-sm-column flex-md-row align-items-center">
                  <div className="me-3">
                    <CgUserRemove className="h1 text-dark mb-3 mb-md-0" />
                  </div>
                  <h4 className="alert-heading mb-0">We've just sent you a confirmation email</h4>
                </div>
                <hr />
                <p>
                  Please click on the link that has just been sent to your email account to delete your account and
                  complete the process.
                </p>
                <p className="mb-0">
                  Please note that the link <span className="fw-bold">is only valid for 15 minutes</span>. If you
                  haven't clicked the link by then you'll need to start the process from the beginning.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="alert alert-warning my-4">
                <span className="fw-bold text-uppercase">Important:</span> Please read this carefully.
              </div>

              <p>
                If you delete your account all repositories belonging to it will be deleted. Please consider
                transferring them to another user.
              </p>
              <p>
                All information related to the repositories will be permanently deleted as well. This includes packages,
                stars, users subscriptions, webhooks, events and notifications. Some of this information was created by
                users and will be lost. In addition to that, all organizations where you are the only member and all
                content belonging to those organizations will be removed as well.
              </p>

              <p>
                <span className="fw-bold">This operation cannot be undone</span>.
              </p>

              <p data-testid="confirmationText">
                Please type <span className="fw-bold">{ctx.user!.alias}</span> to confirm:
              </p>

              <div className="pb-3">
                <InputField type="text" name="alias" autoComplete="off" value="" onChange={onInputChange} />
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default DeleteAccount;
