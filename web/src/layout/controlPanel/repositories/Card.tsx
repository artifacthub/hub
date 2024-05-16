import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaCheck, FaExclamation, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { HiExclamation } from 'react-icons/hi';
import { MdLabel } from 'react-icons/md';
import { RiArrowLeftRightLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { AppCtx } from '../../../context/AppCtx';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { AuthorizerAction, Repository } from '../../../types';
import isFuture from '../../../utils/isFuture';
import minutesToNearestInterval from '../../../utils/minutesToNearestInterval';
import CNCF from '../../common/badges/CNCF';
import RepositoryDisabled from '../../common/badges/RepositoryDisabled';
import SecurityScannerDisabled from '../../common/badges/SecurityScannerDisabled';
import VerifiedPublisher from '../../common/badges/VerifiedPublisher';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import Modal from '../../common/Modal';
import RepositoryIconLabel from '../../common/RepositoryIconLabel';
import ActionBtn from '../ActionBtn';
import BadgeModal from './BadgeModal';
import styles from './Card.module.css';
import DeletionModal from './DeletionModal';
import RepositoryWarningModal from './RepositoryWarningModal';
import TransferRepositoryModal from './TransferModal';

interface ModalStatus {
  open: boolean;
  repository?: Repository;
}

interface Props {
  repository: Repository;
  visibleModal?: string;
  setModalStatus: Dispatch<SetStateAction<ModalStatus>>;
  onSuccess: () => void;
  onAuthError: () => void;
}

const RepositoryCard = (props: Props) => {
  const navigate = useNavigate();
  const { ctx } = useContext(AppCtx);
  const [dropdownMenuStatus, setDropdownMenuStatus] = useState<boolean>(false);
  const [transferModalStatus, setTransferModalStatus] = useState<boolean>(false);
  const [deletionModalStatus, setDeletionModalStatus] = useState<boolean>(false);
  const [badgeModalStatus, setBadgeModalStatus] = useState<boolean>(false);
  const dropdownMenu = useRef(null);
  const organizationName = ctx.prefs.controlPanel.selectedOrg;
  const hasErrors = !isUndefined(props.repository.lastTrackingErrors) && !isNull(props.repository.lastTrackingErrors);
  const hasScanningErrors =
    !isUndefined(props.repository.lastScanningErrors) && !isNull(props.repository.lastScanningErrors);
  const [openErrorsModal, setOpenErrorsModal] = useState<boolean>(false);
  const [openScanningErrorsModal, setOpenScanningErrorsModal] = useState<boolean>(false);

  const closeDropdown = () => {
    setDropdownMenuStatus(false);
  };

  useOutsideClick([dropdownMenu], dropdownMenuStatus, closeDropdown);

  useEffect(() => {
    if (props.visibleModal) {
      if (props.visibleModal === 'scanning') {
        setOpenScanningErrorsModal(true);
      } else {
        setOpenErrorsModal(true);
      }
      navigate('', { replace: true });
    }
  }, []);

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
        {!isFuture(props.repository.lastTrackingTs!) && (
          <span>{moment.unix(props.repository.lastTrackingTs!).fromNow()}</span>
        )}
        {hasErrors ? (
          <>
            <FaExclamation className="mx-1 text-warning" />
            <RepositoryWarningModal />
          </>
        ) : (
          <FaCheck className="mx-1 text-success" />
        )}
      </>
    );

    let nextCheckMsg: string = '';
    if (nextCheckTime > 0 && !props.repository.disabled) {
      nextCheckMsg = `(next check in ~ ${nextCheckTime} minutes)`;
    }

    if (hasErrors) {
      return (
        <>
          {content}
          <Modal
            modalDialogClassName={styles.modalDialog}
            modalClassName="mh-100"
            className={`d-inline-block ${styles.modal}`}
            buttonType={`ms-1 btn badge btn-outline-secondary ${styles.btn}`}
            buttonContent={
              <div className="d-flex flex-row align-items-center">
                <HiExclamation className="me-2" />
                <span className="d-none d-xl-inline d-xxl-none d-xxxl-inline">Show tracking errors log</span>
                <span className="d-inline d-xl-none d-xxl-inline d-xxxl-none">Logs</span>
              </div>
            }
            header={
              <div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>
                Tracking errors log - {props.repository.displayName || props.repository.name}
              </div>
            }
            open={openErrorsModal}
            onClose={() => setOpenErrorsModal(false)}
            footerClassName={styles.modalFooter}
          >
            <div className="d-flex h-100 mw-100 overflow-hidden">
              <div className="d-flex flex-column w-100">
                <div className={`mb-2 ${styles.trackingTime}`}>
                  {moment.unix(props.repository.lastTrackingTs!).format('llll Z')}
                </div>
                <div
                  className={`position-relative flex-grow-1 mw-100 mh-100 overflow-hidden ${styles.modalSyntaxTrackerWrapper}`}
                >
                  {props.repository.lastTrackingErrors && (
                    <SyntaxHighlighter
                      language="bash"
                      style={tomorrowNight}
                      customStyle={{ fontSize: '90%', height: '100%' }}
                    >
                      {props.repository.lastTrackingErrors}
                    </SyntaxHighlighter>
                  )}
                </div>
              </div>
            </div>
          </Modal>
          <span className="ms-3 fst-italic text-muted">{nextCheckMsg}</span>
        </>
      );
    } else {
      return (
        <>
          {content}
          {openErrorsModal && (
            <Modal
              className={`d-inline-block ${styles.modal}`}
              header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Tracking errors log</div>}
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
          <span className="ms-1 fst-italic text-muted">{nextCheckMsg}</span>
        </>
      );
    }
  };

  const getLastScanning = (): JSX.Element => {
    const nextCheckTime: number = minutesToNearestInterval(30, 15);

    if (
      props.repository.scannerDisabled ||
      isUndefined(props.repository.lastTrackingTs) ||
      isNull(props.repository.lastTrackingTs)
    )
      return <>-</>;

    if (isUndefined(props.repository.lastScanningTs) || isNull(props.repository.lastScanningTs)) {
      return (
        <>
          Not scanned yet
          {props.repository.disabled
            ? '.'
            : nextCheckTime > 0
              ? `, next scan in ~ ${nextCheckTime} minutes`
              : ', next scan in less than 30 minutes'}
        </>
      );
    }

    const content = (
      <>
        {!isFuture(props.repository.lastScanningTs!) && (
          <span>{moment.unix(props.repository.lastScanningTs!).fromNow()}</span>
        )}
        {hasScanningErrors ? (
          <FaExclamation className="mx-2 text-warning" />
        ) : (
          <FaCheck className="mx-2 text-success" />
        )}
      </>
    );

    let nextCheckMsg: string = '';
    if (nextCheckTime > 0 && !props.repository.disabled) {
      nextCheckMsg = `(next scan in ~ ${nextCheckTime} minutes)`;
    }

    if (hasScanningErrors) {
      return (
        <>
          {content}
          <Modal
            modalDialogClassName={styles.modalDialog}
            modalClassName="mh-100"
            className={`d-inline-block ${styles.modal}`}
            buttonType={`ms-1 btn badge btn-outline-secondary ${styles.btn}`}
            buttonContent={
              <div className="d-flex flex-row align-items-center">
                <HiExclamation className="me-2" />
                <span className="d-none d-xl-inline d-xxl-none d-xxxl-inline">Show scanning errors log</span>
                <span className="d-inline d-xl-none d-xxl-inline d-xxxl-none">Logs</span>
              </div>
            }
            header={
              <div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>
                Scanning errors log - {props.repository.displayName || props.repository.name}
              </div>
            }
            open={openScanningErrorsModal}
            onClose={() => setOpenErrorsModal(false)}
            footerClassName={styles.modalFooter}
          >
            <div className="d-flex h-100 mw-100 overflow-hidden">
              <div className={`d-flex overflow-scroll ${styles.modalSyntaxWrapper}`}>
                {props.repository.lastScanningErrors && (
                  <SyntaxHighlighter
                    language="bash"
                    style={tomorrowNight}
                    customStyle={{ fontSize: '90%', height: '100%', marginBottom: '0' }}
                  >
                    {props.repository.lastScanningErrors}
                  </SyntaxHighlighter>
                )}
              </div>
            </div>
          </Modal>
          <span className="ms-3 fst-italic text-muted">{nextCheckMsg}</span>
        </>
      );
    } else {
      return (
        <>
          {content}
          {openScanningErrorsModal && (
            <Modal
              className={`d-inline-block ${styles.modal}`}
              header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Scanning errors log</div>}
              open
            >
              <div className="h5 text-center my-5 mw-100">
                It looks like the last security vulnerabilities scan of this repository worked fine and no errors were
                produced.
                <br />
                <br />
                If you have arrived to this screen from an email listing some errors, please keep in mind those may have
                been already solved.
              </div>
            </Modal>
          )}
          <span className="ms-1 fst-italic text-muted">{nextCheckMsg}</span>
        </>
      );
    }
  };

  return (
    <div className="col-12 col-xxl-6 py-sm-3 py-2 px-0 px-xxl-3" data-testid="repoCard">
      <div className="card h-100">
        <div className="card-body d-flex flex-column h-100">
          <div className="d-flex flex-row w-100 justify-content-between">
            <div className={`text-truncate h5 mb-0 ${styles.titleCard}`}>
              {props.repository.displayName || props.repository.name}
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

            <div className="ms-auto ps-3">
              <RepositoryIconLabel kind={props.repository.kind} isPlural />
            </div>

            <div className="ms-3">
              <div
                ref={dropdownMenu}
                className={classnames('dropdown-menu dropdown-menu-end p-0', styles.dropdownMenu, {
                  show: dropdownMenuStatus,
                })}
              >
                <div className={`dropdown-arrow ${styles.arrow}`} />

                <button
                  className="dropdown-item btn btn-sm rounded-0 text-dark"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    setBadgeModalStatus(true);
                  }}
                  aria-label="Open badge modal"
                >
                  <div className="d-flex flex-row align-items-center">
                    <MdLabel className={`me-2 ${styles.btnIcon}`} />
                    <span>Get badge</span>
                  </div>
                </button>

                <ActionBtn
                  className="dropdown-item btn btn-sm rounded-0 text-dark"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    setTransferModalStatus(true);
                  }}
                  action={AuthorizerAction.TransferOrganizationRepository}
                  label="Open transfer repository modal"
                >
                  <>
                    <RiArrowLeftRightLine className={`me-2 ${styles.btnIcon}`} />
                    <span>Transfer</span>
                  </>
                </ActionBtn>

                <ActionBtn
                  className="dropdown-item btn btn-sm rounded-0 text-dark"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    props.setModalStatus({
                      open: true,
                      repository: props.repository,
                    });
                  }}
                  action={AuthorizerAction.UpdateOrganizationRepository}
                  label="Open update repository modal"
                >
                  <>
                    <FaPencilAlt className={`me-2 ${styles.btnIcon}`} />
                    <span>Edit</span>
                  </>
                </ActionBtn>

                <ActionBtn
                  className="dropdown-item btn btn-sm rounded-0 text-dark"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeDropdown();
                    setDeletionModalStatus(true);
                  }}
                  action={AuthorizerAction.DeleteOrganizationRepository}
                  label="Open delete repository modal"
                >
                  <>
                    <FaTrashAlt className={`me-2 ${styles.btnIcon}`} />
                    <span>Delete</span>
                  </>
                </ActionBtn>
              </div>

              <button
                className={`btn btn-outline-secondary p-0 text-center ${styles.btnDropdown}`}
                onClick={() => setDropdownMenuStatus(true)}
                aria-label="Open menu"
                aria-expanded={dropdownMenuStatus}
              >
                <BsThreeDotsVertical />
              </button>
            </div>
          </div>
          {props.repository.repositoryId && (
            <div className="mt-2 d-flex flex-row align-items-baseline">
              <div className="text-truncate">
                <small className="text-muted text-uppercase me-1">ID: </small>
                <small>{props.repository.repositoryId}</small>
              </div>
              <div className={`ms-1 ${styles.copyBtn}`}>
                <div className={`position-absolute ${styles.copyBtnWrapper}`}>
                  <ButtonCopyToClipboard
                    text={props.repository.repositoryId}
                    className="btn-link border-0 text-dark fw-bold"
                    label="Copy repository ID to clipboard"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="text-truncate">
            <small className="text-muted text-uppercase me-1">Url: </small>
            <small>{props.repository.url}</small>
          </div>
          <div>
            <small className="text-muted text-uppercase me-1">Last processed: </small>
            <small>{getLastTracking()}</small>
          </div>
          <div>
            <small className="text-muted text-uppercase me-1">Last security scan: </small>
            <small>{getLastScanning()}</small>
          </div>

          <div className="mt-3 d-flex flex-row justify-content-end">
            {props.repository.disabled && <RepositoryDisabled className="ms-2" />}
            {props.repository.scannerDisabled && <SecurityScannerDisabled className="ms-2" />}
            {props.repository.cncf && <CNCF className="ms-2" inRepo />}
            <VerifiedPublisher verifiedPublisher={props.repository.verifiedPublisher} className="ms-2" inRepo />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryCard;
