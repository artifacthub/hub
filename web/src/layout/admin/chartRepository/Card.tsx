import React, { useState } from 'react';
import moment from 'moment';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { ChartRepository } from '../../../types';
import { FaExclamation, FaCheck, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
import Modal from '../../common/Modal';
import { API } from '../../../api';
import styles from './Card.module.css';

interface ModalStatus {
  open: boolean;
  chartRepository?: ChartRepository;
}

interface Props {
  chartRepository: ChartRepository;
  setModalStatus:  React.Dispatch<React.SetStateAction<ModalStatus>>;
  onSuccess: () => void;
  onAuthError: () => void;
}

const ChartRepositoryCard = (props: Props) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const hasErrors = !isUndefined(props.chartRepository.lastTrackingErrors) && !isNull((props.chartRepository.lastTrackingErrors));
  const getLastTracking = (): JSX.Element => {
    if (isUndefined(props.chartRepository.lastTrackingTs) || isNull(props.chartRepository.lastTrackingTs)) {
      return <>Not processed yet, it will be processed very soon</>;
    }

    const content = (
      <>
        <span>{moment(props.chartRepository.lastTrackingTs! * 1000).fromNow()}</span>

        {hasErrors ? (
          <FaExclamation className="mx-2 text-warning" />
        ) : (
          <FaCheck className="mx-2 text-success" />
        )}
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
            buttonContent={(
              <>
                <span className="d-none d-sm-inline">Show errors log</span>
                <span className="d-inline d-sm-none">Log</span>
              </>
            )}
            header={<div className="h3 m-2">Errors log</div>}
          >
            <div className="mt-3">
              <SyntaxHighlighter language="bash" style={tomorrowNight} customStyle={{fontSize: '75%'}}>
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
      await API.deleteChartRepository(props.chartRepository.name);
      setIsDeleting(false);
      props.onSuccess();

    } catch(err) {
      setIsDeleting(false);
      // TODO - api error

      if (err.statusText === 'ErrLoginRedirect') {
        props.onAuthError();
      }
    }
  }

  return (
    <li className={`list-group-item list-group-item-action ${styles.listItem}`}>
      <div className="d-flex flex-row w-100 justify-content-between">
        <h5 className="mb-1">
          {props.chartRepository.displayName || props.chartRepository.name}
        </h5>

        <div className={`d-flex flex-nowrap ${styles.buttons}`}>
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

          <div className={`mx-2 my-auto h-50 d-none d-sm-inline ${styles.separator}`} />

          <button
            className={`btn btn-sm btn-link text-secondary text-center ${styles.btnAction}`}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              deleteChartRepository();
            }}
            disabled={isDeleting}
          >
            <div className="d-flex flex-row align-items-center">
              {isDeleting ? (
                <>
                  <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                  <span className="ml-2 d-none d-sm-inline">Deleting...</span>
                </>
              ) : (
                <>
                  <FaTrashAlt className={`mr-sm-2 ${styles.btnIcon}`} />
                  <span className="d-none d-sm-inline">Delete</span>
                </>
              )}
            </div>
          </button>
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
}

export default ChartRepositoryCard;
