import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useRef, useState } from 'react';
import { FaEnvelopeOpenText, FaPencilAlt, FaSignOutAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import { MdBusiness } from 'react-icons/md';

import { API } from '../../../api';
import { AppCtx, unselectOrg } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { ErrorKind, Organization } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ExternalLink from '../../common/ExternalLink';
import Image from '../../common/Image';
import styles from './Card.module.css';

interface ModalStatus {
  open: boolean;
  organization?: Organization;
}

interface Props {
  organization: Organization;
  onAuthError: () => void;
  onSuccess: () => void;
  setEditModalStatus: (modalStatus: ModalStatus) => void;
}

const OrganizationCard = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [openDropdownStatus, setOpenDropdownStatus] = useState(false);
  const dropdown = useRef(null);
  const isMember =
    !isUndefined(props.organization.confirmed) && !isNull(props.organization.confirmed) && props.organization.confirmed;

  const closeDropdown = () => {
    setOpenDropdownStatus(false);
  };

  useOutsideClick([dropdown], openDropdownStatus, closeDropdown);

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
    } catch (err) {
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

  return (
    <li className={`list-group-item ${styles.listItem}`} data-testid="organizationCard">
      <div className="d-flex flex-row w-100 justify-content-between align-items-start">
        <div className="d-flex flex-row align-items-center">
          <div
            className={`d-flex align-items-center justify-content-center p-1 overflow-hidden mr-2 ${styles.imageWrapper}`}
          >
            {!isUndefined(props.organization.logoImageId) ? (
              <Image
                alt={props.organization.displayName || props.organization.name}
                imageId={props.organization.logoImageId}
                className={styles.image}
                placeholderIcon={<MdBusiness />}
              />
            ) : (
              <MdBusiness className={styles.image} />
            )}
          </div>

          <div>
            <div className={`h5 mb-0 ${styles.title}`}>{props.organization.displayName || props.organization.name}</div>
          </div>

          {!isMember && (
            <div className="ml-4">
              <span className="badge badge-warning">Invitation not accepted yet</span>
            </div>
          )}
        </div>

        <div
          className={classnames('d-flex flex-nowrap position-relative', {
            [styles.buttons]: !openDropdownStatus || isAccepting,
          })}
        >
          {!isUndefined(props.organization.confirmed) &&
          !isNull(props.organization.confirmed) &&
          props.organization.confirmed ? (
            <>
              <button
                data-testid="editOrgBtn"
                className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  props.setEditModalStatus({
                    open: true,
                    organization: props.organization,
                  });
                }}
              >
                <div className="d-flex flex-row align-items-center">
                  <FaPencilAlt className={`mr-sm-2 ${styles.btnIcon}`} />
                  <span className="d-none d-sm-inline">Edit</span>
                </div>
              </button>

              {isMember && props.organization.membersCount && props.organization.membersCount > 1 && (
                <>
                  <div className={`mx-2 my-auto d-none d-sm-inline ${styles.separator}`} />

                  <button
                    data-testid="leaveOrgDropdownBtn"
                    className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
                    onClick={() => setOpenDropdownStatus(true)}
                  >
                    <div className="d-flex flex-row align-items-center">
                      <FaSignOutAlt className={`mr-sm-2 ${styles.btnIcon}`} />
                      <span className="d-none d-sm-inline">Leave</span>
                    </div>
                  </button>
                </>
              )}

              <div
                ref={dropdown}
                className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdown, {
                  show: openDropdownStatus,
                })}
              >
                <div className={`arrow ${styles.arrow}`} />

                <p className="p-3 text-center mb-0">Are you sure you want to leave this organization?</p>

                <div className="dropdown-divider m-0" />

                <div className="d-flex flex-row justify-content-between p-3">
                  <button className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`} onClick={closeDropdown}>
                    <div className="d-flex flex-row align-items-center">
                      <IoMdCloseCircle className="mr-2" />
                      <span>Cancel</span>
                    </div>
                  </button>

                  <button
                    data-testid="leaveOrgBtn"
                    className="btn btn-sm btn-danger"
                    onClick={(e) => {
                      e.preventDefault();
                      leaveOrganization();
                    }}
                    disabled={isLeaving}
                  >
                    <div className="d-flex flex-row align-items-center text-uppercase">
                      {isLeaving ? (
                        <>
                          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                          <span className="ml-2">Leaving...</span>
                        </>
                      ) : (
                        <>
                          <FaSignOutAlt className={`mr-2 ${styles.btnLeaveIcon}`} />
                          <span>Leave</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <button
                data-testid="acceptInvitationBtn"
                className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
                onClick={confirmOrganizationMembership}
                disabled={isAccepting}
              >
                <div className="d-flex flex-row align-items-center">
                  {isAccepting ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ml-2">Accepting invitation...</span>
                    </>
                  ) : (
                    <>
                      <FaEnvelopeOpenText className={`mr-sm-2 ${styles.btnIcon}`} />
                      <span className="d-none d-sm-inline">Accept invitation</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {!isUndefined(props.organization.homeUrl) && !isNull(props.organization.homeUrl) && (
        <div className="mt-3 text-truncate">
          <small className="text-muted text-uppercase mr-1">Homepage: </small>
          <ExternalLink href={props.organization.homeUrl} className={`text-reset ${styles.link}`}>
            {props.organization.homeUrl}
          </ExternalLink>
        </div>
      )}

      {!isUndefined(props.organization.description) && !isNull(props.organization.description) && (
        <div className="mt-2">
          <p className="mb-0">{props.organization.description}</p>
        </div>
      )}
    </li>
  );
};

export default OrganizationCard;
