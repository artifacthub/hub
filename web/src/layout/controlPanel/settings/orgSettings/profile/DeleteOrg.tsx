import React, { useContext, useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import { API } from '../../../../../api';
import { AppCtx, unselectOrg } from '../../../../../context/AppCtx';
import { AuthorizerAction, ErrorKind, Organization } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import InputField from '../../../../common/InputField';
import Modal from '../../../../common/Modal';
import ActionBtn from '../../../ActionBtn';
import styles from './DeleteOrg.module.css';

interface Props {
  organization: Organization;
  onAuthError: () => void;
}

const DeleteOrganization = (props: Props) => {
  const { dispatch } = useContext(AppCtx);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isValidInput, setIsValidInput] = useState<boolean>(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsValidInput(e.target.value === props.organization.name);
  };

  async function deleteOrganization() {
    try {
      setIsDeleting(true);
      await API.deleteOrganization(props.organization.name);
      dispatch(unselectOrg());
      window.scrollTo(0, 0); // Scroll to top when org is deleted
      setIsDeleting(false);
    } catch (err) {
      setIsDeleting(false);
      if (err.kind === ErrorKind.Unauthorized) {
        props.onAuthError();
      } else {
        let errorMessage = 'An error occurred deleting the organization, please try again later.';
        if (err.kind === ErrorKind.Forbidden) {
          errorMessage = 'You do not have permissions to delete the organization.';
        }
        alertDispatcher.postAlert({
          type: 'danger',
          message: errorMessage,
        });
      }
    }
  }

  return (
    <>
      <div className="mt-4 mt-md-5">
        <p className="mb-4">
          Deleting your organization will also delete all the content that belongs to it. Please be certain as{' '}
          <span className="font-weight-bold">this operation cannot be undone</span>.
        </p>

        <ActionBtn
          testId="deleteModalOrgBtn"
          className="btn btn-sm btn-danger"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setOpenStatus(true);
          }}
          action={AuthorizerAction.DeleteOrganization}
        >
          <div className="d-flex flex-row align-items-center text-uppercase">
            <FaTrashAlt className="mr-2" />
            <div>Delete organization</div>
          </div>
        </ActionBtn>
      </div>

      <Modal
        className="d-inline-block"
        closeButton={
          <>
            <button
              className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`}
              onClick={() => setOpenStatus(false)}
            >
              <div className="d-flex flex-row align-items-center">
                <IoMdCloseCircle className="mr-2" />
                <span>Cancel</span>
              </div>
            </button>

            <button
              data-testid="deleteOrgBtn"
              className="btn btn-sm btn-danger ml-3"
              onClick={(e) => {
                e.preventDefault();
                deleteOrganization();
              }}
              disabled={isDeleting || !isValidInput}
            >
              <div className="d-flex flex-row align-items-center text-uppercase">
                {isDeleting ? (
                  <>
                    <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                    <span className="ml-2">Deleting...</span>
                  </>
                ) : (
                  <>
                    <FaTrashAlt className="mr-2" />
                    <span>Delete</span>
                  </>
                )}
              </div>
            </button>
          </>
        }
        header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Delete organization</div>}
        onClose={() => setOpenStatus(false)}
        open={openStatus}
      >
        <div className="mw-100">
          <div className="alert alert-warning my-4">
            <span className="font-weight-bold text-uppercase">Important:</span> Please read this carefully.
          </div>

          <p>
            If you delete this organization all repositories belonging to it will be deleted. Please consider
            transferring them to another organization or your personal account.
          </p>
          <p>
            All information related to the repositories will be permanently deleted as well. This includes packages,
            stars, users subscriptions, webhooks, events and notifications. Some of this information was created by
            users and will be lost.
          </p>

          <p>
            <span className="font-weight-bold">This operation cannot be undone</span>.
          </p>

          <p data-testid="confirmationText">
            Please type <span className="font-weight-bold">{props.organization.name}</span> to confirm:
          </p>

          <InputField type="text" name="orgName" autoComplete="off" value="" onChange={onInputChange} />
        </div>
      </Modal>
    </>
  );
};

export default DeleteOrganization;
