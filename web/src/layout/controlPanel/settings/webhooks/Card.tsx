import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { MouseEvent as ReactMouseEvent, useContext, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import { TiWarningOutline } from 'react-icons/ti';

import API from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import useOutsideClick from '../../../../hooks/useOutsideClick';
import { ErrorKind, Webhook } from '../../../../types';
import alertDispatcher from '../../../../utils/alertDispatcher';
import ElementWithTooltip from '../../../common/ElementWithTooltip';
import Modal from '../../../common/Modal';
import styles from './Card.module.css';
import LastNotificationsModal from './LastNotificationsModal';

interface Props {
  webhook: Webhook;
  onEdition: () => void;
  onDeletion: () => void;
  onAuthError: () => void;
}

const WebhookCard = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [dropdownMenuStatus, setDropdownMenuStatus] = useState<boolean>(false);
  const dropdownMenu = useRef(null);
  const [deletionModalStatus, setDeletionModalStatus] = useState<boolean>(false);

  const closeDropdown = () => {
    setDropdownMenuStatus(false);
  };

  useOutsideClick([dropdownMenu], dropdownMenuStatus, closeDropdown);

  async function deleteWebhook() {
    try {
      setIsDeleting(true);
      await API.deleteWebhook(props.webhook.webhookId!, ctx.prefs.controlPanel.selectedOrg);
      setIsDeleting(false);
      props.onDeletion();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsDeleting(false);
      if (err.kind === ErrorKind.Unauthorized) {
        props.onAuthError();
      } else {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred deleting the webhook, please try again later.',
        });
      }
    }
  }

  return (
    <div className="col-12 col-xxl-6 py-sm-3 py-2 px-0 px-xxl-3" role="listitem">
      <div className={`card cardWithHover w-100 h-100 mw-100 bg-white ${styles.card}`}>
        <div className="card-body position-relative">
          <div className="d-flex flex-row">
            <div className="h5 card-title mb-3 me-3 lh-1 text-break">
              <div className="d-flex flex-row align-items-start">
                <div>{props.webhook.name}</div>
                {props.webhook.active ? (
                  <span
                    className={`ms-3 mt-1 fw-bold badge border border-success border-1 text-success text-uppercase ${styles.badge}`}
                  >
                    Active
                  </span>
                ) : (
                  <span
                    className={`ms-3 mt-1 fw-bold badge border border-dark border-1 text-dark text-uppercase ${styles.badge} ${styles.inactiveBadge}`}
                  >
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {deletionModalStatus && (
              <Modal
                className={`d-inline-block ${styles.modal}`}
                closeButton={
                  <>
                    <button
                      className="btn btn-sm btn-outline-secondary text-uppercase"
                      onClick={() => setDeletionModalStatus(false)}
                      aria-label="Close deletion modal"
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
                        deleteWebhook();
                      }}
                      disabled={isDeleting}
                      aria-label="Delete webhook"
                    >
                      <div className="d-flex flex-row align-items-center text-uppercase">
                        {isDeleting ? (
                          <>
                            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                            <span className="ms-2">Deleting...</span>
                          </>
                        ) : (
                          <>
                            <FaTrashAlt className={`me-2 ${styles.btnDeleteIcon}`} />
                            <span>Delete</span>
                          </>
                        )}
                      </div>
                    </button>
                  </>
                }
                header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Delete webhook</div>}
                onClose={() => setDeletionModalStatus(false)}
                open
              >
                <div className="mt-3 mw-100 text-center">
                  <p>Are you sure you want to delete this webhook?</p>
                </div>
              </Modal>
            )}

            <div className="ms-auto">
              <div
                ref={dropdownMenu}
                className={classnames('dropdown-menu dropdown-menu-end p-0', styles.dropdownMenu, {
                  show: dropdownMenuStatus,
                })}
              >
                <div className={`dropdown-arrow ${styles.arrow}`} />

                <button
                  className="dropdown-item btn btn-sm rounded-0 text-dark"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    props.onEdition();
                  }}
                  aria-label="Edit webhook"
                >
                  <div className="d-flex flex-row align-items-center">
                    <FaPencilAlt className={`me-2 ${styles.btnIcon}`} />
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
                  aria-label="Open deletion webhook modal"
                >
                  <div className="d-flex flex-row align-items-center">
                    <FaTrashAlt className={`me-2 ${styles.btnIcon}`} />
                    <span>Delete</span>
                  </div>
                </button>
              </div>

              <button
                className={`btn btn-outline-secondary p-0 text-center  ${styles.btnDropdown}`}
                onClick={() => setDropdownMenuStatus(true)}
                aria-label="Open menu"
                aria-expanded={dropdownMenuStatus}
              >
                <BsThreeDotsVertical />
              </button>
            </div>
          </div>

          <div className="d-flex flex-column">
            <div className="card-subtitle d-flex flex-column mw-100 mt-1">
              <p className="card-text">{props.webhook.description}</p>
            </div>

            <div className="text-truncate">
              <small className="text-muted text-uppercase me-2">Url:</small>
              <small>{props.webhook.url}</small>
            </div>

            <div className="d-flex flex-row justify-content-between align-items-baseline">
              {props.webhook.lastNotifications && (
                <div className="d-none d-md-inline mt-2">
                  <LastNotificationsModal notifications={props.webhook.lastNotifications} />
                </div>
              )}

              {(isUndefined(props.webhook.packages) || props.webhook.packages.length === 0) && (
                <div className="ms-auto mt-2">
                  <ElementWithTooltip
                    element={
                      <span className={`d-flex flex-row align-items-center badge bg-warning ${styles.badgeNoPackages}`}>
                        <TiWarningOutline />
                        <span className="ms-1">No packages</span>
                      </span>
                    }
                    tooltipMessage="This webhook is not associated to any packages."
                    active
                    visibleTooltip
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookCard;
