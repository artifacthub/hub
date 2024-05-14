import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { MouseEvent as ReactMouseEvent, useContext, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaSignOutAlt, FaUser, FaUserMinus } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import API from '../../../api';
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
    <div className="col-12 col-xxl-6 py-sm-3 py-2 px-0 px-xxl-3" data-testid="memberCard">
      <div className="card h-100">
        <div className="card-body d-flex flex-column h-100">
          <div className="d-flex flex-row w-100 justify-content-between align-items-start">
            <div
              className={`d-flex align-items-center justify-content-center p-1 overflow-hidden me-2 border border-2 rounded-circle bg-white ${styles.imageWrapper} imageWrapper`}
            >
              <FaUser className={`fs-4 ${styles.image}`} />
            </div>

            <div className="flex-grow-1">
              <div className="d-flex flex-row align-items-start">
                <div className="h5 mb-1">
                  {props.member.firstName || props.member.lastName ? getFullName() : props.member.alias}
                </div>
                {!isUndefined(props.member.confirmed) && !props.member.confirmed && (
                  <div className={classnames('ms-3', { 'me-3': props.membersNumber > 1 })}>
                    <span className="badge bg-warning">Invitation not accepted yet</span>
                  </div>
                )}
              </div>
              <div className="h6 text-muted me-1 fst-italic">{props.member.alias}</div>
            </div>

            {props.membersNumber > 1 && (
              <>
                {modalStatus && (
                  <Modal
                    className="d-inline-block"
                    closeButton={
                      <>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setModalStatus(false)}
                          aria-label="Cancel"
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
                            deleteMember();
                          }}
                          disabled={isDeletingMember}
                          aria-label={isUser ? 'Leave organization' : 'Remove member'}
                        >
                          <div className="d-flex flex-row align-items-center text-uppercase">
                            {isDeletingMember ? (
                              <>
                                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                                <span className="ms-2">{isUser ? 'Leaving...' : 'Removing...'}</span>
                              </>
                            ) : (
                              <>
                                {isUser ? (
                                  <FaSignOutAlt className={`me-2 ${styles.btnIcon}`} />
                                ) : (
                                  <FaUserMinus className={`me-2 ${styles.btnIcon}`} />
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

                <div className="ms-auto">
                  <div
                    ref={dropdownMenu}
                    className={classnames('dropdown-menu dropdown-menu-end p-0', styles.dropdownMenu, {
                      show: dropdownMenuStatus,
                    })}
                  >
                    <div className="dropdown-arrow" />

                    {isUser ? (
                      <button
                        className="dropdown-item btn btn-sm rounded-0 text-dark"
                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          closeDropdown();
                          setModalStatus(true);
                        }}
                        aria-label="Open leave organization modal"
                      >
                        <div className="d-flex flex-row align-items-center">
                          <FaSignOutAlt className={`me-2 ${styles.btnIcon}`} />
                          <span>Leave</span>
                        </div>
                      </button>
                    ) : (
                      <ActionBtn
                        className="dropdown-item btn btn-sm rounded-0 text-dark"
                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          closeDropdown();
                          setModalStatus(true);
                        }}
                        action={AuthorizerAction.DeleteOrganizationMember}
                        label="Open leave organization modal"
                      >
                        <>
                          <FaUserMinus className={`me-2 ${styles.btnIcon}`} />
                          <span>Remove</span>
                        </>
                      </ActionBtn>
                    )}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
