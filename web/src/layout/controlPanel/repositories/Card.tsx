import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaCheck, FaExclamation, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { HiExclamation } from 'react-icons/hi';
import { IoMdCloseCircle } from 'react-icons/io';
import { MdLabel } from 'react-icons/md';
import { RiArrowLeftRightLine } from 'react-icons/ri';
import { useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { AuthorizerAction, ErrorKind, Repository } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import minutesToNearestInterval from '../../../utils/minutesToNearestInterval';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import Modal from '../../common/Modal';
import OfficialBadge from '../../common/OfficialBadge';
import RepositoryIcon from '../../common/RepositoryIcon';
import VerifiedPublisherBadge from '../../common/VerifiedPublisherBadge';
import ActionBtn from '../ActionBtn';
import BadgeModal from './BadgeModal';
import styles from './Card.module.css';
import TransferRepositoryModal from './TransferModal';

interface ModalStatus {
  open: boolean;
  repository?: Repository;
}

interface Props {
  repository: Repository;
  visibleTrackingErrorLogs: boolean;
  setModalStatus: React.Dispatch<React.SetStateAction<ModalStatus>>;
  onSuccess: () => void;
  onAuthError: () => void;
}

const RepositoryCard = (props: Props) => {
  const history = useHistory();
  const { ctx } = useContext(AppCtx);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dropdownMenuStatus, setDropdownMenuStatus] = useState<boolean>(false);
  const [transferModalStatus, setTransferModalStatus] = useState<boolean>(false);
  const [deletionModalStatus, setDeletionModalStatus] = useState<boolean>(false);
  const [badgeModalStatus, setBadgeModalStatus] = useState<boolean>(false);
  const dropdownMenu = useRef(null);
  const organizationName = ctx.prefs.controlPanel.selectedOrg;
  const hasErrors = !isUndefined(props.repository.lastTrackingErrors) && !isNull(props.repository.lastTrackingErrors);
  const [openErrorsModal, setOpenErrorsModal] = useState<boolean>(false);

  const closeDropdown = () => {
    setDropdownMenuStatus(false);
  };

  useOutsideClick([dropdownMenu], dropdownMenuStatus, closeDropdown);

  useEffect(() => {
    if (props.visibleTrackingErrorLogs) {
      setOpenErrorsModal(true);
      history.replace({
        search: '',
      });
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  const getLastTracking = (): JSX.Element => {
    const nextProcessedTime: number = minutesToNearestInterval(30);

    if (isUndefined(props.repository.lastTrackingTs) || isNull(props.repository.lastTrackingTs)) {
      return (
        <>
          Not processed yet,{' '}
          {nextProcessedTime > 0
            ? `it will be processed automatically in ~ ${nextProcessedTime} minutes`
            : 'it will be processed automatically in less than 30 minutes'}
        </>
      );
    }

    const content = (
      <>
        <span>{moment(props.repository.lastTrackingTs! * 1000).fromNow()}</span>
        {hasErrors ? <FaExclamation className="mx-2 text-warning" /> : <FaCheck className="mx-2 text-success" />}
      </>
    );

    let messageAboutNextProcessedTime: string = '';
    if (nextProcessedTime > 0) {
      messageAboutNextProcessedTime = `(it will be processed again in ~ ${nextProcessedTime} minutes)`;
    }

    if (hasErrors) {
      return (
        <>
          {content}
          <Modal
            modalDialogClassName={styles.modalDialog}
            className={`d-inline-block ${styles.modal}`}
            buttonType={`ml-1 btn badge btn-secondary ${styles.btn}`}
            buttonContent={
              <div className="d-flex flex-row align-items-center">
                <HiExclamation className="mr-2" />
                <span className="d-none d-sm-inline">Show errors log</span>
                <span className="d-inline d-sm-none">Logs</span>
              </div>
            }
            header={
              <div className={`h3 m-2 text-truncate ${styles.title}`}>
                Errors log - {props.repository.displayName || props.repository.name}
              </div>
            }
            open={openErrorsModal}
            onClose={() => setOpenErrorsModal(false)}
          >
            <div className="mt-3 mw-100">
              <SyntaxHighlighter language="bash" style={tomorrowNight} customStyle={{ fontSize: '90%' }}>
                {props.repository.lastTrackingErrors}
              </SyntaxHighlighter>
            </div>
          </Modal>
          <span className="ml-3 font-italic text-muted">{messageAboutNextProcessedTime}</span>
        </>
      );
    } else {
      return (
        <>
          {content}
          {openErrorsModal && (
            <Modal
              className={`d-inline-block ${styles.modal}`}
              header={<div className={`h3 m-2 ${styles.title}`}>Errors log</div>}
              open
            >
              <div className="h5 text-center my-5 mw-100">
                It looks like the last tracking of this repository worked fine and no errors were produced.
                <br />
                <br />
                If you have arrived to this screen from an email listing some errors, please keep in mind those may have
                been already solved.
              </div>
            </Modal>
          )}
          <span className="ml-1 font-italic text-muted">{messageAboutNextProcessedTime}</span>
        </>
      );
    }
  };

  async function deleteRepository() {
    try {
      setIsDeleting(true);
      await API.deleteRepository(props.repository.name, organizationName);
      setIsDeleting(false);
      props.onSuccess();
    } catch (err) {
      setIsDeleting(false);
      if (err.kind === ErrorKind.Unauthorized) {
        props.onAuthError();
      } else {
        let errorMessage = 'An error occurred deleting the repository, please try again later.';
        if (!isUndefined(organizationName) && err.kind === ErrorKind.Forbidden) {
          errorMessage = 'You do not have permissions to delete the repository from the organization.';
        }
        alertDispatcher.postAlert({
          type: 'danger',
          message: errorMessage,
        });
      }
    }
  }

  return (
    <li className={`list-group-item ${styles.listItem}`} data-testid="repoCard">
      <div className="d-flex flex-row w-100 justify-content-between">
        <div className="d-flex flex-row align-items-center mb-1 text-truncate">
          <div className={`h5 mb-0 mr-3 text-truncate ${styles.titleCard}`}>
            {props.repository.displayName || props.repository.name}
          </div>

          <OfficialBadge
            official={props.repository.official}
            className={`ml-3 d-none d-md-inline ${styles.labelWrapper}`}
          />

          <VerifiedPublisherBadge
            verifiedPublisher={props.repository.verifiedPublisher}
            className={`ml-3 d-none d-md-inline ${styles.labelWrapper}`}
          />
        </div>

        {transferModalStatus && (
          <TransferRepositoryModal
            open={true}
            repository={props.repository}
            onSuccess={props.onSuccess}
            onAuthError={props.onAuthError}
            onClose={() => setTransferModalStatus(false)}
          />
        )}

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
                  data-testid="deleteRepoBtn"
                  className="btn btn-sm btn-danger ml-3"
                  onClick={(e) => {
                    e.preventDefault();
                    deleteRepository();
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
                        <FaTrashAlt className={`mr-2 ${styles.Icon}`} />
                        <span>Delete</span>
                      </>
                    )}
                  </div>
                </button>
              </>
            }
            header={<div className={`h3 m-2 ${styles.title}`}>Delete repository</div>}
            onClose={() => setDeletionModalStatus(false)}
            open
          >
            <div className="mt-3 mw-100 text-center">
              <p>If you delete this repository all packages belonging to it will be deleted.</p>

              <p>
                Please note that some other items which depend on your repository, like users subscriptions to packages,
                will be deleted as well. <span className="font-weight-bold">This operation cannot be undone</span>.
              </p>
            </div>
          </Modal>
        )}

        {badgeModalStatus && (
          <BadgeModal
            repository={props.repository}
            onClose={() => setBadgeModalStatus(false)}
            open={badgeModalStatus}
          />
        )}

        <div className="ml-auto">
          <RepositoryIcon kind={props.repository.kind} className={styles.kindIcon} />
        </div>

        <div className="ml-3">
          <div
            ref={dropdownMenu}
            className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdownMenu, {
              show: dropdownMenuStatus,
            })}
          >
            <div className={`arrow ${styles.arrow}`} />

            <button
              data-testid="getBadgeBtn"
              className="dropdown-item btn btn-sm rounded-0 text-secondary"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                closeDropdown();
                setBadgeModalStatus(true);
              }}
            >
              <div className="d-flex flex-row align-items-center">
                <MdLabel className={`mr-2 ${styles.btnIcon}`} />
                <span>Get badge</span>
              </div>
            </button>

            <ActionBtn
              testId="transferRepoBtn"
              className="dropdown-item btn btn-sm rounded-0 text-secondary"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                closeDropdown();
                setTransferModalStatus(true);
              }}
              action={AuthorizerAction.TransferOrganizationRepository}
            >
              <>
                <RiArrowLeftRightLine className={`mr-2 ${styles.btnIcon}`} />
                <span>Transfer</span>
              </>
            </ActionBtn>

            <ActionBtn
              testId="updateRepoBtn"
              className="dropdown-item btn btn-sm rounded-0 text-secondary"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                closeDropdown();
                props.setModalStatus({
                  open: true,
                  repository: props.repository,
                });
              }}
              action={AuthorizerAction.UpdateOrganizationRepository}
            >
              <>
                <FaPencilAlt className={`mr-2 ${styles.btnIcon}`} />
                <span>Edit</span>
              </>
            </ActionBtn>

            <ActionBtn
              testId="deleteRepoDropdownBtn"
              className="dropdown-item btn btn-sm rounded-0 text-secondary"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                closeDropdown();
                setDeletionModalStatus(true);
              }}
              action={AuthorizerAction.DeleteOrganizationRepository}
            >
              <>
                <FaTrashAlt className={`mr-2 ${styles.btnIcon}`} />
                <span>Delete</span>
              </>
            </ActionBtn>
          </div>

          <button
            className={`btn btn-light p-0 text-secondary text-center ${styles.btnDropdown}`}
            onClick={() => setDropdownMenuStatus(true)}
          >
            <BsThreeDotsVertical />
          </button>
        </div>
      </div>
      {!isUndefined(props.repository.repositoryId) && (
        <div className="mt-2 d-flex flex-row align-items-baseline">
          <div className="text-truncate">
            <small className="text-muted text-uppercase mr-1">ID: </small>
            <small>{props.repository.repositoryId}</small>
          </div>
          <div className={`ml-1 ${styles.copyBtn}`}>
            <div className={`position-absolute ${styles.copyBtnWrapper}`}>
              <ButtonCopyToClipboard
                text={props.repository.repositoryId}
                className="btn-link border-0 text-secondary font-weight-bold"
              />
            </div>
          </div>
        </div>
      )}
      <div className="text-truncate">
        <small className="text-muted text-uppercase mr-1">Url: </small>
        <small>{props.repository.url}</small>
      </div>
      {!isUndefined(props.repository.lastTrackingTs) && (
        <div>
          <small className="text-muted text-uppercase mr-1">Last processed: </small>
          <small>{getLastTracking()}</small>
        </div>
      )}

      <div className="mt-3 m-md-0 d-flex flex-row d-md-none">
        <OfficialBadge official={props.repository.official} className="mr-3" />
        <VerifiedPublisherBadge verifiedPublisher={props.repository.verifiedPublisher} />
      </div>
    </li>
  );
};

export default RepositoryCard;
