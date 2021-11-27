import classnames from 'classnames';
import moment from 'moment';
import { Dispatch, MouseEvent as ReactMouseEvent, SetStateAction, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import API from '../../../../../api';
import useOutsideClick from '../../../../../hooks/useOutsideClick';
import { APIKey, ErrorKind } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import ButtonCopyToClipboard from '../../../../common/ButtonCopyToClipboard';
import Modal from '../../../../common/Modal';
import styles from './Card.module.css';

interface ModalStatus {
  open: boolean;
  apiKey?: APIKey;
}

interface Props {
  apiKey: APIKey;
  setModalStatus: Dispatch<SetStateAction<ModalStatus>>;
  onSuccess: () => void;
  onAuthError: () => void;
}

const APIKeyCard = (props: Props) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [dropdownMenuStatus, setDropdownMenuStatus] = useState<boolean>(false);
  const dropdownMenu = useRef(null);
  const [deletionModalStatus, setDeletionModalStatus] = useState<boolean>(false);

  const closeDropdown = () => {
    setDropdownMenuStatus(false);
  };

  useOutsideClick([dropdownMenu], dropdownMenuStatus, closeDropdown);

  async function deleteAPIKey() {
    try {
      setIsDeleting(true);
      await API.deleteAPIKey(props.apiKey.apiKeyId!);
      setIsDeleting(false);
      props.onSuccess();
    } catch (err: any) {
      setIsDeleting(false);
      if (err.kind === ErrorKind.Unauthorized) {
        props.onAuthError();
      } else {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred deleting the API key, please try again later.',
        });
      }
    }
  }

  return (
    <div className="col-12 col-xxl-6 py-sm-3 py-2" data-testid="APIKeyCard">
      <div className="card h-100">
        <div className="card-body d-flex flex-column h-100">
          <div className="d-flex flex-row w-100 justify-content-between">
            <div className={`h5 mb-1 mr-2 ${styles.titleCard}`}>{props.apiKey.name}</div>
            {deletionModalStatus && (
              <Modal
                className={`d-inline-block ${styles.modal}`}
                closeButton={
                  <>
                    <button
                      className="btn btn-sm btn-outline-secondary text-uppercase"
                      onClick={() => setDeletionModalStatus(false)}
                      aria-label="Cancel"
                    >
                      <div className="d-flex flex-row align-items-center">
                        <IoMdCloseCircle className="mr-2" />
                        <span>Cancel</span>
                      </div>
                    </button>

                    <button
                      className="btn btn-sm btn-danger ml-3"
                      onClick={(e) => {
                        e.preventDefault();
                        closeDropdown();
                        deleteAPIKey();
                      }}
                      disabled={isDeleting}
                      aria-label="Delete API key"
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
                  </>
                }
                header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Delete API key</div>}
                onClose={() => setDeletionModalStatus(false)}
                open
              >
                <div className="mt-3 mw-100 text-center">
                  <p>Are you sure you want to remove this API key?</p>
                </div>
              </Modal>
            )}

            <div className="ml-auto">
              <div
                ref={dropdownMenu}
                className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdownMenu, {
                  show: dropdownMenuStatus,
                })}
              >
                <div className={`arrow ${styles.arrow}`} />

                <button
                  className="dropdown-item btn btn-sm rounded-0 text-dark"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    props.setModalStatus({
                      open: true,
                      apiKey: props.apiKey,
                    });
                  }}
                  aria-label="Open API key modal"
                >
                  <div className="d-flex flex-row align-items-center">
                    <FaPencilAlt className={`mr-2 ${styles.btnIcon}`} />
                    <span>Edit</span>
                  </div>
                </button>

                <button
                  className="dropdown-item btn btn-sm rounded-0 text-dark"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    setDeletionModalStatus(true);
                  }}
                  aria-label="Open deletion modal"
                >
                  <div className="d-flex flex-row align-items-center">
                    <FaTrashAlt className={`mr-2 ${styles.btnIcon}`} />
                    <span>Delete</span>
                  </div>
                </button>
              </div>

              <button
                className={`btn btn-outline-secondary rounded-circle p-0 text-center iconSubsWrapper ${styles.btnDropdown}`}
                onClick={() => setDropdownMenuStatus(true)}
                aria-label="Open menu"
                aria-expanded={dropdownMenuStatus}
              >
                <BsThreeDotsVertical />
              </button>
            </div>
          </div>

          <div className="mt-2 d-flex flex-row align-items-baseline">
            <div className="text-truncate">
              <small className="text-muted text-uppercase mr-1">API-KEY-ID: </small>
              <small>{props.apiKey.apiKeyId}</small>
            </div>
            <div className={`ml-1 ${styles.copyBtn}`}>
              <div className={`position-absolute ${styles.copyBtnWrapper}`}>
                <ButtonCopyToClipboard
                  text={props.apiKey.apiKeyId!}
                  className="btn-link border-0 text-dark font-weight-bold"
                  label="Copy API key ID to clipboard"
                />
              </div>
            </div>
          </div>
          <div className="text-truncate">
            <small className="text-muted text-uppercase mr-1">Created at: </small>
            <small>{moment.unix(props.apiKey.createdAt!).format('YYYY/MM/DD HH:mm:ss (Z)')}</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIKeyCard;
