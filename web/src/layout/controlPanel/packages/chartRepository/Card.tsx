import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import React, { useContext, useRef, useState } from 'react';
import { FaCheck, FaExclamation, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import useOutsideClick from '../../../../hooks/useOutsideClick';
import { ChartRepository } from '../../../../types';
import Modal from '../../../common/Modal';
import styles from './Card.module.css';

interface ModalStatus {
  open: boolean;
  chartRepository?: ChartRepository;
}

interface Props {
  chartRepository: ChartRepository;
  setModalStatus: React.Dispatch<React.SetStateAction<ModalStatus>>;
  onSuccess: () => void;
  onAuthError: () => void;
}

const ChartRepositoryCard = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiDeleteError, setApiDeleteError] = useState<string | null>(null);
  const [openDropdownStatus, setOpenDropdownStatus] = useState(false);
  const dropdown = useRef(null);
  const organizationName = isNull(ctx.org) ? undefined : ctx.org.name;
  const hasErrors =
    !isUndefined(props.chartRepository.lastTrackingErrors) && !isNull(props.chartRepository.lastTrackingErrors);

  const closeDropdown = () => {
    setApiDeleteError(null);
    setOpenDropdownStatus(false);
  };

  useOutsideClick([dropdown], openDropdownStatus, closeDropdown);

  const getLastTracking = (): JSX.Element => {
    if (isUndefined(props.chartRepository.lastTrackingTs) || isNull(props.chartRepository.lastTrackingTs)) {
      return <>Not processed yet, it will be processed automatically in less than 30m</>;
    }

    const content = (
      <>
        <span>{moment(props.chartRepository.lastTrackingTs! * 1000).fromNow()}</span>
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
                <span className="d-inline d-sm-none">Log</span>
              </>
            }
            header={<div className="h3 m-2">Errors log</div>}
          >
            <div className="mt-3 mw-100">
              <SyntaxHighlighter language="bash" style={tomorrowNight} customStyle={{ fontSize: '90%' }}>
                {props.chartRepository.lastTrackingErrors}
              </SyntaxHighlighter>
            </div>
          </Modal>
        </>
      );
    } else {
      return content;
    }
  };

  async function deleteChartRepository() {
    try {
      setIsDeleting(true);
      await API.deleteChartRepository(props.chartRepository.name, organizationName);
      setIsDeleting(false);
      setOpenDropdownStatus(false);
      props.onSuccess();
    } catch (err) {
      setIsDeleting(false);
      if (err.statusText === 'ErrLoginRedirect') {
        setOpenDropdownStatus(false);
        props.onAuthError();
      } else {
        setApiDeleteError('An error occurred, please try again later');
      }
    }
  }

  return (
    <li className={`list-group-item list-group-item-action ${styles.listItem}`}>
      <div className="d-flex flex-row w-100 justify-content-between">
        <h5 className="mb-1">{props.chartRepository.displayName || props.chartRepository.name}</h5>

        <div className={classnames('d-flex flex-nowrap position-relative', { [styles.buttons]: !openDropdownStatus })}>
          <button
            className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              props.setModalStatus({
                open: true,
                chartRepository: props.chartRepository,
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
              If you delete this chart repository all packages belonging to it will be deleted
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
                className="btn btn-sm btn-danger"
                onClick={(e) => {
                  e.preventDefault();
                  deleteChartRepository();
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

            {!isNull(apiDeleteError) && (
              <div className="alert alert-danger mx-3" role="alert">
                {apiDeleteError}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 text-truncate">
        <small className="text-muted text-uppercase mr-1">Url: </small>
        <small>{props.chartRepository.url}</small>
      </div>
      {!isUndefined(props.chartRepository.lastTrackingTs) && (
        <div className="mt-2">
          <small className="text-muted text-uppercase mr-1">Last processed: </small>
          <small>{getLastTracking()}</small>
        </div>
      )}
    </li>
  );
};

export default ChartRepositoryCard;
