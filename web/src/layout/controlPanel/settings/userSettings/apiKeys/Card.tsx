import classnames from 'classnames';
import moment from 'moment';
import React, { useRef, useState } from 'react';
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import { API } from '../../../../../api';
import useOutsideClick from '../../../../../hooks/useOutsideClick';
import { APIKey } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import styles from './Card.module.css';

interface ModalStatus {
  open: boolean;
  apiKey?: APIKey;
}

interface Props {
  apiKey: APIKey;
  setModalStatus: React.Dispatch<React.SetStateAction<ModalStatus>>;
  onSuccess: () => void;
  onAuthError: () => void;
}

const APIKeyCard = (props: Props) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDropdownStatus, setOpenDropdownStatus] = useState(false);
  const dropdown = useRef(null);

  const closeDropdown = () => {
    setOpenDropdownStatus(false);
  };

  useOutsideClick([dropdown], openDropdownStatus, closeDropdown);

  async function deleteAPIKey() {
    try {
      setIsDeleting(true);
      await API.deleteAPIKey(props.apiKey.apiKeyId!);
      setIsDeleting(false);
      setOpenDropdownStatus(false);
      props.onSuccess();
    } catch (err) {
      setIsDeleting(false);
      if (err.statusText === 'ErrLoginRedirect') {
        setOpenDropdownStatus(false);
        props.onAuthError();
      } else {
        setOpenDropdownStatus(false);
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred deleting the API key, please try again later',
        });
      }
    }
  }

  return (
    <li className={`list-group-item ${styles.listItem}`} data-testid="APIKeyCard">
      <div className="d-flex flex-row w-100 justify-content-between">
        <div className={`h5 mb-1 ${styles.titleCard}`}>{props.apiKey.name}</div>

        <div className={classnames('d-flex flex-nowrap position-relative', { [styles.buttons]: !openDropdownStatus })}>
          <button
            data-testid="updateAPIKeyBtn"
            className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              props.setModalStatus({
                open: true,
                apiKey: props.apiKey,
              });
            }}
          >
            <div className="d-flex flex-row align-items-center">
              <FaPencilAlt className={`mr-sm-2 ${styles.btnIcon}`} />
              <span className="d-none d-sm-inline">Edit</span>
            </div>
          </button>

          <div className={`mx-2 my-auto d-none d-sm-inline ${styles.separator}`} />

          <button
            data-testid="deleteAPIKeyDropdownBtn"
            className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
            onClick={() => setOpenDropdownStatus(true)}
          >
            <div className="d-flex flex-row align-items-center">
              <FaTrashAlt className={`mr-sm-2 ${styles.btnIcon}`} />
              <span className="d-none d-sm-inline">Delete</span>
            </div>
          </button>

          <div
            ref={dropdown}
            className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdown, {
              show: openDropdownStatus,
            })}
          >
            <div className={`arrow ${styles.arrow}`} />

            <p className="p-3 text-center mb-0">Are you sure you want to remove this API key?</p>

            <div className="dropdown-divider m-0" />

            <div className="d-flex flex-row justify-content-between p-3">
              <button className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`} onClick={closeDropdown}>
                <div className="d-flex flex-row align-items-center">
                  <IoMdCloseCircle className="mr-2" />
                  <span>Cancel</span>
                </div>
              </button>

              <button
                data-testid="deleteAPIKeyBtn"
                className="btn btn-sm btn-danger"
                onClick={(e) => {
                  e.preventDefault();
                  deleteAPIKey();
                }}
                disabled={isDeleting}
              >
                <div className="d-flex flex-row align-items-center text-uppercase">
                  {isDeleting ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ml-2">Deleting...</span>
                    </>
                  ) : (
                    <>
                      <FaTrashAlt className={`mr-2 ${styles.btnDeleteIcon}`} />
                      <span>Delete</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-truncate">
        <small className="text-muted text-uppercase mr-1">Created at: </small>
        <small>{moment(props.apiKey.createdAt! * 1000).format('YYYY/MM/DD HH:mm:ss (Z)')}</small>
      </div>
    </li>
  );
};

export default APIKeyCard;
