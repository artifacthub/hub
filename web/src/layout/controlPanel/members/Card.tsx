import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useRef, useState } from 'react';
import { FaSignOutAlt, FaUser } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import { TiDelete } from 'react-icons/ti';

import { API } from '../../../api';
import { AppCtx, unselectOrg } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { Member } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import styles from './Card.module.css';

interface Props {
  member: Member;
  membersNumber: number;
  onSuccess: () => void;
  onAuthError: () => void;
}

const MemberCard = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [openDropdownStatus, setOpenDropdownStatus] = useState(false);
  const dropdown = useRef(null);

  const handleDeleteMember = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    deleteMember();
  };

  const closeDropdown = () => {
    setOpenDropdownStatus(false);
  };

  useOutsideClick([dropdown], openDropdownStatus, closeDropdown);

  async function deleteMember() {
    try {
      setIsDeletingMember(true);
      await API.deleteOrganizationMember(ctx.org!.name, props.member.alias);
      setIsDeletingMember(false);
      closeDropdown();
      if (props.member.alias === ctx.user!.alias) {
        dispatch(unselectOrg());
      } else {
        props.onSuccess();
      }
    } catch (err) {
      setIsDeletingMember(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        closeDropdown();
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred removing member from the organization, please try again later',
        });
      } else {
        props.onAuthError();
      }
    }
  }

  const isUser = props.member.alias === ctx.user!.alias;

  const getFullName = (): string => {
    let fullName = '';
    if (!isNull(props.member.firstName)) {
      fullName += `${props.member.firstName} `;
    }
    if (!isNull(props.member.lastName)) {
      fullName += props.member.lastName;
    }
    return fullName;
  };

  return (
    <li className={`list-group-item list-group-item-action ${styles.listItem}`}>
      <div className="d-flex flex-row w-100 justify-content-between align-items-start">
        <div className="d-flex flex-row align-items-center">
          <div
            className={`d-flex align-items-center justify-content-center p-1 overflow-hidden mr-2 ${styles.imageWrapper}`}
          >
            <FaUser className={styles.image} />
          </div>

          <div>
            <h5 className="mb-1">
              <div className="d-flex flex-row align-items-start">
                {!isNull(props.member.firstName) || !isNull(props.member.lastName) ? getFullName() : props.member.alias}
                {!isUndefined(props.member.confirmed) && !props.member.confirmed && (
                  <small className="ml-4">
                    <span className="badge badge-warning">Invitation not accepted yet</span>
                  </small>
                )}
              </div>
            </h5>
            <div className="h6 text-muted mr-1 font-italic">{props.member.alias}</div>
          </div>
        </div>

        <div className={classnames('d-flex flex-nowrap position-relative', { [styles.buttons]: !openDropdownStatus })}>
          {props.membersNumber > 1 && (
            <button
              className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
              onClick={() => setOpenDropdownStatus(true)}
            >
              <div className="d-flex flex-row align-items-center">
                {isUser ? (
                  <FaSignOutAlt className={`mr-sm-2 ${styles.btnIcon}`} />
                ) : (
                  <TiDelete className={`mr-sm-2 ${styles.btnIcon}`} />
                )}
                <span className="d-none d-sm-inline">{isUser ? 'Leave' : 'Remove'}</span>
              </div>
            </button>
          )}
          <div
            ref={dropdown}
            className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdown, {
              show: openDropdownStatus,
            })}
          >
            <div className={`arrow ${styles.arrow}`} />

            <p className="p-3 text-center mb-0">
              {isUser
                ? 'Are you sure you want to leave this organization?'
                : 'Are you sure you want to remove this member from this organization?'}
            </p>

            <div className="dropdown-divider m-0" />

            <div className="d-flex flex-row justify-content-between p-3">
              <button className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`} onClick={closeDropdown}>
                <div className="d-flex flex-row align-items-center">
                  <IoMdCloseCircle className="mr-2" />
                  <span>Cancel</span>
                </div>
              </button>

              <button className="btn btn-sm btn-danger" onClick={handleDeleteMember} disabled={isDeletingMember}>
                <div className="d-flex flex-row align-items-center text-uppercase">
                  {isDeletingMember ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ml-2">{isUser ? 'Leaving...' : 'Removing...'}</span>
                    </>
                  ) : (
                    <>
                      <FaSignOutAlt className={`mr-2 ${styles.btnLeaveIcon}`} />
                      <span>{isUser ? 'Leave' : 'Remove'}</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export default MemberCard;
