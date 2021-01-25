import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaCheck, FaExclamation, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { HiExclamation } from 'react-icons/hi';
import { MdLabel } from 'react-icons/md';
import { RiArrowLeftRightLine } from 'react-icons/ri';
import { useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { AppCtx } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { AuthorizerAction, Repository } from '../../../types';
import minutesToNearestInterval from '../../../utils/minutesToNearestInterval';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import DisabledRepositoryBadge from '../../common/DisabledRepositoryBadge';
import Modal from '../../common/Modal';
import OfficialBadge from '../../common/OfficialBadge';
import RepositoryIconLabel from '../../common/RepositoryIconLabel';
import ScannerDisabledRepositoryBadge from '../../common/ScannerDisabledRepositoryBadge';
import VerifiedPublisherBadge from '../../common/VerifiedPublisherBadge';
import ActionBtn from '../ActionBtn';
import BadgeModal from './BadgeModal';
import styles from './Card.module.css';
import DeletionModal from './DeletionModal';
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
    const nextCheckTime: number = minutesToNearestInterval(30);

    if (isUndefined(props.repository.lastTrackingTs) || isNull(props.repository.lastTrackingTs)) {
      return (
        <>
          Not processed yet
          {props.repository.disabled
            ? '.'
            : nextCheckTime > 0
            ? `, it will be processed automatically in ~ ${nextCheckTime} minutes`
            : ', it will be processed automatically in less than 30 minutes'}
        </>
      );
    }

    const content = (
      <>
        <span>{moment(props.repository.lastTrackingTs! * 1000).fromNow()}</span>
        {hasErrors ? <FaExclamation className="mx-2 text-warning" /> : <FaCheck className="mx-2 text-success" />}
      </>
    );

    let nextCheckMsg: string = '';
    if (nextCheckTime > 0 && !props.repository.disabled) {
      nextCheckMsg = `(it will be checked for updates again in ~ ${nextCheckTime} minutes)`;
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
              <div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>
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
          <span className="ml-3 font-italic text-muted">{nextCheckMsg}</span>
        </>
      );
    } else {
      return (
        <>
          {content}
          {openErrorsModal && (
            <Modal
              className={`d-inline-block ${styles.modal}`}
              header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Errors log</div>}
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
          <span className="ml-1 font-italic text-muted">{nextCheckMsg}</span>
        </>
      );
    }
  };

  return (
    <div className="col-12 col-xxl-6 py-sm-3 py-2" data-testid="repoCard">
      <div className="card h-100">
        <div className="card-body d-flex flex-column h-100">
          <div className="d-flex flex-row w-100 justify-content-between">
            <div className="d-flex flex-row align-items-center mb-1 text-truncate">
              <div className={`h5 mb-0 text-truncate ${styles.titleCard}`}>
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

              <DisabledRepositoryBadge
                disabled={props.repository.disabled!}
                className={`ml-3 d-none d-md-inline ${styles.labelWrapper}`}
              />

              <ScannerDisabledRepositoryBadge
                scannerDisabled={props.repository.scannerDisabled!}
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
              <DeletionModal
                repository={props.repository}
                organizationName={organizationName}
                setDeletionModalStatus={setDeletionModalStatus}
                onSuccess={props.onSuccess}
                onAuthError={props.onAuthError}
              />
            )}

            {badgeModalStatus && (
              <BadgeModal
                repository={props.repository}
                onClose={() => setBadgeModalStatus(false)}
                open={badgeModalStatus}
              />
            )}

            <div className="ml-auto pl-3">
              <RepositoryIconLabel kind={props.repository.kind} isPlural />
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
          {props.repository.repositoryId && (
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
          <div>
            <small className="text-muted text-uppercase mr-1">Last processed: </small>
            <small>{getLastTracking()}</small>
          </div>

          <div className="mt-3 m-md-0 d-flex flex-row d-md-none">
            <OfficialBadge official={props.repository.official} className="mr-3" />
            <VerifiedPublisherBadge verifiedPublisher={props.repository.verifiedPublisher} className="mr-3" />
            <DisabledRepositoryBadge disabled={props.repository.disabled!} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryCard;
