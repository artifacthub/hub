import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaSignOutAlt, FaUser, FaUserMinus } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import { API } from '../../../api';
import { AppCtx, unselectOrg } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { AuthorizerAction, ErrorKind, Member } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import Modal from '../../common/Modal';
import ActionBtn from '../ActionBtn';
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
  const dropdownMenu = useRef(null);
  const [dropdownMenuStatus, setDropdownMenuStatus] = useState<boolean>(false);
  const [modalStatus, setModalStatus] = useState<boolean>(false);

  const closeDropdown = () => {
    setDropdownMenuStatus(false);
  };

  useOutsideClick([dropdownMenu], dropdownMenuStatus, closeDropdown);

  async function deleteMember() {
    try {
      setIsDeletingMember(true);
      await API.deleteOrganizationMember(ctx.prefs.controlPanel.selectedOrg!, props.member.alias);
      setIsDeletingMember(false);
      if (props.member.alias === ctx.user!.alias) {
        dispatch(unselectOrg());
      } else {
        props.onSuccess();
      }
    } catch (err) {
      setIsDeletingMember(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let errorMessage = 'An error occurred removing member from the organization, please try again later.';
        if (err.kind === ErrorKind.Forbidden) {
          errorMessage = 'You do not have permissions to remove members from the organization.';
        }
        alertDispatcher.postAlert({
          type: 'danger',
          message: errorMessage,
        });
      } else {
        props.onAuthError();
      }
    }
  }

  const isUser = props.member.alias === ctx.user!.alias;

  const getFullName = (): string => {
    let fullName = '';
    if (props.member.firstName) {
      fullName += `${props.member.firstName} `;
    }
    if (props.member.lastName) {
      fullName += props.member.lastName;
    }
    return fullName;
  };

  return (
    <div className="col-12 col-xxl-6 py-sm-3 py-2" data-testid="memberCard">
      <div className="card h-100">
        <div className="card-body d-flex flex-column h-100">
          <div className="d-flex flex-row w-100 justify-content-between align-items-start">
            <div
              className={`d-flex align-items-center justify-content-center p-1 overflow-hidden mr-2 ${styles.imageWrapper} imageWrapper`}
            >
              <FaUser className={styles.image} />
            </div>

            <div className="flex-grow-1">
              <div className="d-flex flex-row align-items-start">
                <div className="h5 mb-1">
                  {props.member.firstName || props.member.lastName ? getFullName() : props.member.alias}
                </div>
                {!isUndefined(props.member.confirmed) && !props.member.confirmed && (
                  <div className={classnames('ml-3', { 'mr-3': props.membersNumber > 1 })}>
                    <span className="badge badge-warning">Invitation not accepted yet</span>
                  </div>
                )}
              </div>
              <div className="h6 text-muted mr-1 font-italic">{props.member.alias}</div>
            </div>

            {props.membersNumber > 1 && (
              <>
                {modalStatus && (
                  <Modal
                    className={`d-inline-block ${styles.modal}`}
                    closeButton={
                      <>
                        <button
                          className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`}
                          onClick={() => setModalStatus(false)}
                        >
                          <div className="d-flex flex-row align-items-center">
                            <IoMdCloseCircle className="mr-2" />
                            <span>Cancel</span>
                          </div>
                        </button>

                        <button
                          data-testid="leaveOrRemoveBtn"
                          className="btn btn-sm btn-danger ml-3"
                          onClick={(e) => {
                            e.preventDefault();
                            deleteMember();
                          }}
                          disabled={isDeletingMember}
                        >
                          <div className="d-flex flex-row align-items-center text-uppercase">
                            {isDeletingMember ? (
                              <>
                                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                                <span className="ml-2">{isUser ? 'Leaving...' : 'Removing...'}</span>
                              </>
                            ) : (
                              <>
                                {isUser ? (
                                  <FaSignOutAlt className={`mr-2 ${styles.btnIcon}`} />
                                ) : (
                                  <FaUserMinus className={`mr-2 ${styles.btnIcon}`} />
                                )}
                                <span>{isUser ? 'Leave' : 'Remove'}</span>
                              </>
                            )}
                          </div>
                        </button>
                      </>
                    }
                    header={
                      <div className={`h3 flex-grow-1 m-2 ${styles.title}`}>
                        {isUser ? 'Leave ' : 'Remove from '} organization
                      </div>
                    }
                    onClose={() => setModalStatus(false)}
                    open
                  >
                    <div className="mt-3 mw-100 text-center">
                      <p>
                        {isUser
                          ? 'Are you sure you want to leave this organization?'
                          : 'Are you sure you want to remove this member from this organization?'}
                      </p>
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

                    {isUser ? (
                      <button
                        data-testid="leaveOrRemoveModalBtn"
                        className="dropdown-item btn btn-sm rounded-0 text-secondary"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          closeDropdown();
                          setModalStatus(true);
                        }}
                      >
                        <div className="d-flex flex-row align-items-center">
                          <FaSignOutAlt className={`mr-2 ${styles.btnIcon}`} />
                          <span>Leave</span>
                        </div>
                      </button>
                    ) : (
                      <ActionBtn
                        testId="leaveOrRemoveModalBtn"
                        className="dropdown-item btn btn-sm rounded-0 text-secondary"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          closeDropdown();
                          setModalStatus(true);
                        }}
                        action={AuthorizerAction.DeleteOrganizationMember}
                      >
                        <>
                          <FaUserMinus className={`mr-2 ${styles.btnIcon}`} />
                          <span>Remove</span>
                        </>
                      </ActionBtn>
                    )}
                  </div>

                  <button
                    className={`btn btn-light p-0 text-secondary text-center ${styles.btnDropdown}`}
                    onClick={() => setDropdownMenuStatus(true)}
                  >
                    <BsThreeDotsVertical />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
