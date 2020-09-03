import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaCheck, FaExclamation, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import { MdVerifiedUser } from 'react-icons/md';
import { RiArrowLeftRightLine } from 'react-icons/ri';
import { useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { ErrorKind, Repository } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import Label from '../../common/Label';
import Modal from '../../common/Modal';
import RepositoryIcon from '../../common/RepositoryIcon';
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
    if (isUndefined(props.repository.lastTrackingTs) || isNull(props.repository.lastTrackingTs)) {
      return <>Not processed yet, it will be processed automatically in less than 30m</>;
    }

    const content = (
      <>
        <span>{moment(props.repository.lastTrackingTs! * 1000).fromNow()}</span>
        {hasErrors ? <FaExclamation className="mx-2 text-warning" /> : <FaCheck className="mx-2 text-success" />}
      </>
    );

    if (hasErrors) {
      return (
        <>
          {content}
          <Modal
            modalDialogClassName={styles.modalDialog}
            className={`d-inline-block ${styles.modal}`}
            buttonType={`ml-1 btn badge btn-secondary ${styles.btn}`}
            buttonContent={
              <>
                <span className="d-none d-sm-inline">Show errors log</span>
                <span className="d-inline d-sm-none">Logs</span>
              </>
            }
            header={<div className={`h3 m-2 ${styles.title}`}>Errors log</div>}
            open={openErrorsModal}
            onClose={() => setOpenErrorsModal(false)}
          >
            <div className="mt-3 mw-100">
              <SyntaxHighlighter language="bash" style={tomorrowNight} customStyle={{ fontSize: '90%' }}>
                {props.repository.lastTrackingErrors}
              </SyntaxHighlighter>
            </div>
          </Modal>
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
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred deleting the repository, please try again later.',
        });
      }
    }
  }

  return (
    <li className={`list-group-item ${styles.listItem}`} data-testid="repoCard">
      <div className="d-flex flex-row w-100 justify-content-between">
        <div className="d-flex flex-row align-items-center mb-1">
          <div className={`h5 mb-0 ${styles.titleCard}`}>{props.repository.displayName || props.repository.name}</div>

          {!isUndefined(props.repository.verifiedPublisher) && props.repository.verifiedPublisher && (
            <Label icon={<MdVerifiedUser />} text="Verified Publisher" className="ml-3 d-none d-md-inline" />
          )}
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
              data-testid="transferRepoBtn"
              className="dropdown-item btn btn-sm rounded-0 text-secondary"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                closeDropdown();
                setTransferModalStatus(true);
              }}
            >
              <div className="d-flex flex-row align-items-center">
                <RiArrowLeftRightLine className={`mr-2 ${styles.btnIcon}`} />
                <span>Transfer</span>
              </div>
            </button>

            <button
              data-testid="updateRepoBtn"
              className="dropdown-item btn btn-sm rounded-0 text-secondary"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                closeDropdown();
                props.setModalStatus({
                  open: true,
                  repository: props.repository,
                });
              }}
            >
              <div className="d-flex flex-row align-items-center">
                <FaPencilAlt className={`mr-2 ${styles.btnIcon}`} />
                <span>Edit</span>
              </div>
            </button>

            <button
              data-testid="deleteRepoDropdownBtn"
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
      {!isUndefined(props.repository.repositoryId) && (
        <div className="mt-2 text-truncate">
          <small className="text-muted text-uppercase mr-1">ID: </small>
          <small>{props.repository.repositoryId}</small>
          <div className="d-inline-block ml-1">
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

      {!isUndefined(props.repository.verifiedPublisher) && props.repository.verifiedPublisher && (
        <Label icon={<MdVerifiedUser />} text="Verified Publisher" className="mt-3 m-md-0 d-flex d-md-none" />
      )}
    </li>
  );
};

export default RepositoryCard;
