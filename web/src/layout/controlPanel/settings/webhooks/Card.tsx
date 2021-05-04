import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React, { useContext, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import { TiWarningOutline } from 'react-icons/ti';

import { API } from '../../../../api';
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
    } catch (err) {
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
    <div className="col-12 col-xxl-6 py-sm-3 py-2" role="listitem">
      <div className={`card cardWithHover w-100 ${styles.card}`}>
        <div className={`card-body p-0 position-relative ${styles.body}`}>
          <div className="d-flex flex-row">
            <div className={`h5 card-title mb-3 mr-3 ${styles.title}`}>
              <div className="d-flex flex-row align-items-start">
                <div>{props.webhook.name}</div>
                {props.webhook.active ? (
                  <span
                    className={`ml-3 mt-1 font-weight-bold badge badge-pill border border-success text-success text-uppercase ${styles.badge}`}
                  >
                    Active
                  </span>
                ) : (
                  <span
                    className={`ml-3 mt-1 font-weight-bold badge badge-pill border border-dark text-dark text-uppercase ${styles.badge} ${styles.inactiveBadge}`}
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
                      className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`}
                      onClick={() => setDeletionModalStatus(false)}
                    >
                      <div className="d-flex flex-row align-items-center">
                        <IoMdCloseCircle className="mr-2" />
                        <span>Cancel</span>
                      </div>
                    </button>

                    <button
                      data-testid="deleteWebhookBtn"
                      className="btn btn-sm btn-danger ml-3"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteWebhook();
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

            <div className="ml-auto">
              <div
                ref={dropdownMenu}
                className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdownMenu, {
                  show: dropdownMenuStatus,
                })}
              >
                <div className={`arrow ${styles.arrow}`} />

                <button
                  data-testid="editWebhookBtn"
                  className="dropdown-item btn btn-sm rounded-0 text-secondary"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    props.onEdition();
                  }}
                >
                  <div className="d-flex flex-row align-items-center">
                    <FaPencilAlt className={`mr-2 ${styles.btnIcon}`} />
                    <span>Edit</span>
                  </div>
                </button>

                <button
                  data-testid="deleteWebhookModalBtn"
                  className="dropdown-item btn btn-sm rounded-0 text-secondary"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    setDeletionModalStatus(true);
                  }}
                >
                  <div className="d-flex flex-row align-items-center">
                    <FaTrashAlt className={`mr-2 ${styles.btnIcon}`} />
                    <span>Delete</span>
                  </div>
                </button>
              </div>

              <button
                className={`btn btn-light p-0 text-secondary text-center ${styles.btnDropdown}`}
                onClick={() => setDropdownMenuStatus(true)}
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
              <small className="text-muted text-uppercase mr-2">Url:</small>
              <small>{props.webhook.url}</small>
            </div>

            <div className="d-flex flex-row justify-content-between align-items-baseline">
              {props.webhook.lastNotifications && (
                <div className="d-none d-md-inline mt-2">
                  <LastNotificationsModal notifications={props.webhook.lastNotifications} />
                </div>
              )}

              {(isUndefined(props.webhook.packages) || props.webhook.packages.length === 0) && (
                <div className="ml-auto mt-2">
                  <ElementWithTooltip
                    element={
                      <span
                        className={`d-flex flex-row align-items-center badge badge-warning badge-pill ${styles.badgeNoPackages}`}
                      >
                        <TiWarningOutline />
                        <span className="ml-1">No packages</span>
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
