import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useRef, useState } from 'react';
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import useOutsideClick from '../../../../hooks/useOutsideClick';
import { ErrorKind, Webhook } from '../../../../types';
import alertDispatcher from '../../../../utils/alertDispatcher';
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
  const [openDropdownStatus, setOpenDropdownStatus] = useState(false);
  const dropdown = useRef(null);

  const closeDropdown = () => {
    setOpenDropdownStatus(false);
  };

  useOutsideClick([dropdown], openDropdownStatus, closeDropdown);

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
    <div className="mb-3" role="listitem">
      <div className={`card w-100 ${styles.card}`}>
        <div className={`card-body p-0 position-relative ${styles.body}`}>
          <div className="d-flex flex-row">
            <div className="flex-grow-1">
              <div className={`card-title mb-3 ${styles.title}`}>
                <div className="h5 d-flex flex-row align-items-center">
                  {props.webhook.name}
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
            </div>

            <div
              className={classnames('d-flex flex-nowrap position-relative', {
                [styles.buttons]: !openDropdownStatus || isDeleting,
              })}
            >
              <button
                data-testid="editWebhookBtn"
                className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
                onClick={props.onEdition}
              >
                <div className="d-flex flex-row align-items-center">
                  <FaPencilAlt className={`mr-sm-2 ${styles.btnIcon}`} />
                  <span className="d-none d-sm-inline">Edit</span>
                </div>
              </button>

              <div className={`mx-2 my-auto d-none d-sm-inline ${styles.separator}`} />

              <button
                data-testid="deleteWebhookDropdownBtn"
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
                data-testid="deleteWebhookDropdown"
                className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdown, {
                  show: openDropdownStatus,
                })}
              >
                <div className={`arrow ${styles.arrow}`} />

                <p className="p-3 text-center mb-0">Are you sure you want to delete this webhook?</p>

                <div className="dropdown-divider m-0" />

                <div className="d-flex flex-row justify-content-between p-3">
                  <button
                    className={`btn btn-sm btn-light mr-3 text-uppercase ${styles.btnLight}`}
                    onClick={closeDropdown}
                  >
                    <div className="d-flex flex-row align-items-center">
                      <IoMdCloseCircle className="mr-2" />
                      <span>Cancel</span>
                    </div>
                  </button>

                  <button
                    data-testid="deleteWebhookBtn"
                    className="btn btn-sm btn-danger"
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
                          <FaTrashAlt className="mr-2" />
                          <span>Delete</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
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

            {!isUndefined(props.webhook.lastNotifications) && !isNull(props.webhook.lastNotifications) && (
              <div className="d-none d-md-inline mt-2">
                <LastNotificationsModal notifications={props.webhook.lastNotifications} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookCard;
