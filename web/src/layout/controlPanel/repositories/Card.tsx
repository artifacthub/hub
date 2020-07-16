import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import React, { useContext, useRef, useState } from 'react';
import { FaCheck, FaExclamation, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import { RiArrowLeftRightLine } from 'react-icons/ri';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { ErrorKind, Repository } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
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
  setModalStatus: React.Dispatch<React.SetStateAction<ModalStatus>>;
  onSuccess: () => void;
  onAuthError: () => void;
}

const RepositoryCard = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDropdownStatus, setOpenDropdownStatus] = useState(false);
  const [transferModalStatus, setTransferModalStatus] = useState<boolean>(false);
  const dropdown = useRef(null);
  const organizationName = ctx.prefs.controlPanel.selectedOrg;
  const hasErrors = !isUndefined(props.repository.lastTrackingErrors) && !isNull(props.repository.lastTrackingErrors);

  const closeDropdown = () => {
    setOpenDropdownStatus(false);
  };

  useOutsideClick([dropdown], openDropdownStatus, closeDropdown);

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
            buttonType="ml-1 btn badge btn-secondary"
            buttonContent={
              <>
                <span className="d-none d-sm-inline">Show errors log</span>
                <span className="d-inline d-sm-none">Logs</span>
              </>
            }
            header={<div className={`h3 m-2 ${styles.title}`}>Errors log</div>}
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
      return content;
    }
  };

  async function deleteRepository() {
    try {
      setIsDeleting(true);
      await API.deleteRepository(props.repository.name, organizationName);
      setIsDeleting(false);
      setOpenDropdownStatus(false);
      props.onSuccess();
    } catch (err) {
      setIsDeleting(false);
      if (err.kind === ErrorKind.Unauthorized) {
        setOpenDropdownStatus(false);
        props.onAuthError();
      } else {
        setOpenDropdownStatus(false);
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
        <div className={`h5 mb-1 ${styles.titleCard}`}>{props.repository.displayName || props.repository.name}</div>

        {transferModalStatus && (
          <TransferRepositoryModal
            open={true}
            repository={props.repository}
            onSuccess={props.onSuccess}
            onAuthError={props.onAuthError}
            onClose={() => setTransferModalStatus(false)}
          />
        )}

        <div
          className={classnames('d-flex flex-nowrap position-relative ml-auto', {
            [styles.buttons]: !openDropdownStatus,
          })}
        >
          <button
            data-testid="transferRepoBtn"
            className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              setTransferModalStatus(true);
            }}
          >
            <div className="d-flex flex-row align-items-center">
              <RiArrowLeftRightLine className={`mr-sm-2 ${styles.btnIcon}`} />
              <span className="d-none d-sm-inline">Transfer</span>
            </div>
          </button>

          <div className={`mx-2 my-auto d-none d-sm-inline ${styles.separator}`} />

          <button
            data-testid="updateRepoBtn"
            className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              props.setModalStatus({
                open: true,
                repository: props.repository,
              });
            }}
          >
            <div className="d-flex flex-row align-items-center">
              <FaPencilAlt className={`mr-sm-2 ${styles.btnIcon}`} />
              <span className="d-none d-sm-inline">Edit</span>
            </div>
          </button>

          <div className={`mx-2 my-auto d-none d-sm-inline ${styles.separator}`} />

          <button
            data-testid="deleteRepoDropdownBtn"
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
            className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdown, {
              show: openDropdownStatus,
            })}
          >
            <div className={`arrow ${styles.arrow}`} />

            <p className="p-3 text-center mb-0">
              If you delete this repository all packages belonging to it will be deleted
            </p>

            <div className="dropdown-divider m-0" />

            <div className="d-flex flex-row justify-content-between p-3">
              <button className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`} onClick={closeDropdown}>
                <div className="d-flex flex-row align-items-center">
                  <IoMdCloseCircle className="mr-2" />
                  <span>Cancel</span>
                </div>
              </button>

              <button
                data-testid="deleteRepoBtn"
                className="btn btn-sm btn-danger"
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
                      <FaTrashAlt className={`mr-2 ${styles.btnDeleteIcon}`} />
                      <span>Delete</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div>
          <RepositoryIcon kind={props.repository.kind} className={`ml-3 ${styles.kindIcon}`} />
        </div>
      </div>
      <div className="mt-2 text-truncate">
        <small className="text-muted text-uppercase mr-1">Url: </small>
        <small>{props.repository.url}</small>
      </div>
      {!isUndefined(props.repository.lastTrackingTs) && (
        <div className="mt-2">
          <small className="text-muted text-uppercase mr-1">Last processed: </small>
          <small>{getLastTracking()}</small>
        </div>
      )}
    </li>
  );
};

export default RepositoryCard;
