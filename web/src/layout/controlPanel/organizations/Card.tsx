import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { MouseEvent as ReactMouseEvent, useContext, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaEnvelopeOpenText, FaSignOutAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import { MdBusiness } from 'react-icons/md';

import API from '../../../api';
import { AppCtx, unselectOrg } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { ErrorKind, Organization } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ExternalLink from '../../common/ExternalLink';
import Image from '../../common/Image';
import Modal from '../../common/Modal';
import styles from './Card.module.css';

interface Props {
  organization: Organization;
  onAuthError: () => void;
  onSuccess: () => void;
}

const OrganizationCard = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const dropdownMenu = useRef(null);
  const [dropdownMenuStatus, setDropdownMenuStatus] = useState<boolean>(false);
  const [leaveModalStatus, setLeaveModalStatus] = useState<boolean>(false);

  const isMember =
    !isUndefined(props.organization.confirmed) && !isNull(props.organization.confirmed) && props.organization.confirmed;

  const closeDropdown = () => {
    setDropdownMenuStatus(false);
  };

  useOutsideClick([dropdownMenu], dropdownMenuStatus, closeDropdown);

  async function leaveOrganization() {
    try {
      setIsLeaving(true);
      await API.deleteOrganizationMember(props.organization.name, ctx.user!.alias);
      setIsLeaving(false);
      closeDropdown();
      props.onSuccess();
      if (
        !isUndefined(ctx.prefs.controlPanel.selectedOrg) &&
        ctx.prefs.controlPanel.selectedOrg === props.organization.name
      ) {
        dispatch(unselectOrg());
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsLeaving(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        closeDropdown();
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred leaving the organization, please try again later.',
        });
      } else {
        props.onAuthError();
      }
    }
  }

  async function confirmOrganizationMembership() {
    setIsAccepting(true);
    try {
      await API.confirmOrganizationMembership(props.organization.name);
      setIsAccepting(false);
      props.onSuccess();
    } catch {
      setIsAccepting(false);
    }
  }

  const hasDropdownContent =
    !isUndefined(props.organization) &&
    (!props.organization.confirmed ||
      (props.organization.confirmed &&
        isMember &&
        props.organization.membersCount &&
        props.organization.membersCount > 1));

  return (
    <div className="col-12 col-xxl-6 py-sm-3 py-2 px-0 px-xxl-3" data-testid="organizationCard">
      <div className="card h-100">
        <div className="card-body d-flex flex-column h-100">
          <div className="d-flex flex-row w-100 justify-content-between align-items-start">
            <div className="d-flex flex-row align-items-center w-100">
              <div
                className={`d-flex align-items-center justify-content-center overflow-hidden me-2 position-relative ${styles.imageWrapper}`}
              >
                {!isUndefined(props.organization.logoImageId) ? (
                  <Image
                    alt={props.organization.displayName || props.organization.name}
                    imageId={props.organization.logoImageId}
                    className={`fs-4 ${styles.image}`}
                    placeholderIcon={<MdBusiness />}
                  />
                ) : (
                  <MdBusiness className={styles.icon} />
                )}
              </div>

              <div className="text-truncate">
                <div className={`h5 mb-0 text-truncate ${styles.title}`}>
                  {props.organization.displayName || props.organization.name}
                </div>
              </div>

              {!isMember && (
                <div className="ms-3">
                  <span className="badge bg-warning">Invitation not accepted yet</span>
                </div>
              )}

              <div className="ms-auto">
                <div
                  ref={dropdownMenu}
                  className={classnames('dropdown-menu dropdown-menu-end p-0', styles.dropdownMenu, {
                    show: dropdownMenuStatus,
                  })}
                >
                  <div className={`dropdown-arrow ${styles.arrow}`} />

                  {props.organization.confirmed ? (
                    <>
                      {isMember && props.organization.membersCount && props.organization.membersCount > 1 && (
                        <button
                          className="dropdown-item btn btn-sm rounded-0 text-dark"
                          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            closeDropdown();
                            setLeaveModalStatus(true);
                          }}
                          aria-label="Open modal"
                        >
                          <div className="d-flex flex-row align-items-center">
                            <FaSignOutAlt className={`me-2 ${styles.btnIcon}`} />
                            <span>Leave</span>
                          </div>
                        </button>
                      )}
                    </>
                  ) : (
                    <div>
                      <button
                        className="dropdown-item btn btn-sm rounded-0 text-dark"
                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          confirmOrganizationMembership();
                          closeDropdown();
                        }}
                        disabled={isAccepting}
                        aria-label="Confirm membership"
                      >
                        <div className="d-flex flex-row align-items-center">
                          {isAccepting ? (
                            <>
                              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                              <span className="ms-2">Accepting invitation...</span>
                            </>
                          ) : (
                            <>
                              <FaEnvelopeOpenText className={`me-2 ${styles.btnIcon}`} />
                              <span>Accept invitation</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {hasDropdownContent && (
                  <button
                    className={`ms-3 mb-2 btn btn-outline-secondary p-0 text-center  ${styles.btnDropdown}`}
                    onClick={() => setDropdownMenuStatus(true)}
                    aria-label="Open menu"
                    aria-expanded={dropdownMenuStatus}
                  >
                    <BsThreeDotsVertical />
                  </button>
                )}
              </div>
            </div>

            {leaveModalStatus && (
              <Modal
                className={`d-inline-block ${styles.modal}`}
                closeButton={
                  <>
                    <button
                      className="btn btn-sm btn-outline-secondary text-uppercase"
                      onClick={() => setLeaveModalStatus(false)}
                      aria-label="Close modal"
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
                        leaveOrganization();
                      }}
                      disabled={isLeaving}
                      aria-label="Leave organization"
                    >
                      <div className="d-flex flex-row align-items-center text-uppercase">
                        {isLeaving ? (
                          <>
                            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                            <span className="ms-2">Leaving...</span>
                          </>
                        ) : (
                          <>
                            <FaSignOutAlt className={`me-2 ${styles.btnIcon}`} />
                            <span>Leave</span>
                          </>
                        )}
                      </div>
                    </button>
                  </>
                }
                header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Leave organization</div>}
                onClose={() => setLeaveModalStatus(false)}
                open
              >
                <div className="mt-3 mw-100 text-center">
                  <p>Are you sure you want to leave this organization?</p>
                </div>
              </Modal>
            )}
          </div>

          {props.organization.homeUrl && (
            <div className="mt-3 text-truncate">
              <small className="text-muted text-uppercase me-1">Homepage: </small>
              <ExternalLink
                href={props.organization.homeUrl}
                className={`text-reset ${styles.link}`}
                label={`Open link ${props.organization.homeUrl}`}
              >
                {props.organization.homeUrl}
              </ExternalLink>
            </div>
          )}

          {props.organization.description && (
            <div className="mt-2">
              <p className={`mb-0 text-muted ${styles.description}`}>{props.organization.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationCard;
