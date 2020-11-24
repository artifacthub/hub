import { isUndefined } from 'lodash';
import React, { useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import { API } from '../../../api';
import { ErrorKind, Repository } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import InputField from '../../common/InputField';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';

interface Props {
  repository: Repository;
  organizationName?: string;
  setDeletionModalStatus: (value: React.SetStateAction<boolean>) => void;
  onSuccess: () => void;
  onAuthError: () => void;
}

const DeletionModal = (props: Props) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isValidInput, setIsValidInput] = useState<boolean>(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsValidInput(e.target.value === props.repository.name);
  };

  async function deleteRepository() {
    try {
      setIsDeleting(true);
      await API.deleteRepository(props.repository.name, props.organizationName);
      setIsDeleting(false);
      props.onSuccess();
    } catch (err) {
      setIsDeleting(false);
      if (err.kind === ErrorKind.Unauthorized) {
        props.onAuthError();
      } else {
        let errorMessage = 'An error occurred deleting the repository, please try again later.';
        if (!isUndefined(props.organizationName) && err.kind === ErrorKind.Forbidden) {
          errorMessage = 'You do not have permissions to delete the repository from the organization.';
        }
        alertDispatcher.postAlert({
          type: 'danger',
          message: errorMessage,
        });
      }
    }
  }

  return (
    <Modal
      className="d-inline-block"
      closeButton={
        <>
          <button
            className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`}
            onClick={() => props.setDeletionModalStatus(false)}
          >
            <div className="d-flex flex-row align-items-center">
              <IoMdCloseCircle className="mr-2" />
              <span>Cancel</span>
            </div>
          </button>

          <button
            data-testid="deleteRepoBtn"
            className="btn btn-sm btn-danger ml-3"
            onClick={(e) => {
              e.preventDefault();
              deleteRepository();
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
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Delete repository</div>}
      onClose={() => props.setDeletionModalStatus(false)}
      open
    >
      <div className="mw-100">
        <div className="alert alert-warning my-4">
          <span className="font-weight-bold text-uppercase">Important:</span> Please read this carefully.
        </div>

        <p>If you delete this repository all packages belonging to it will be deleted.</p>

        <p>
          All information related to your repository or packages will be permanently deleted as well. This includes
          packages' stars, users subscriptions to packages, webhooks, events and notifications.
        </p>

        <p>
          <span className="font-weight-bold">This operation cannot be undone</span>.
        </p>

        <p>
          Please type <span className="font-weight-bold">{props.repository.name}</span> to confirm:
        </p>

        <InputField type="text" name="repoName" autoComplete="off" value="" onChange={onInputChange} />
      </div>
    </Modal>
  );
};

export default DeletionModal;
