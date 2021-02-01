import isNull from 'lodash/isNull';
import moment from 'moment';
import React from 'react';
import { FaCheck, FaExclamation, FaTimes } from 'react-icons/fa';
import { GrConnect } from 'react-icons/gr';

import { WebhookNotification } from '../../../../types';
import Modal from '../../../common/Modal';
import styles from './LastNotificationsModal.module.css';

interface Props {
  notifications: WebhookNotification[];
}

const LastNotificationsModal = (props: Props) => {
  const notificationsWithErrors: WebhookNotification[] = props.notifications.filter(
    (notif: WebhookNotification) => notif.error
  );

  return (
    <>
      <Modal
        className="d-inline-block"
        buttonType="btn badge btn-secondary"
        buttonContent={
          <>
            <GrConnect className={`mr-2 ${styles.icon}`} />
            <span>Show last notifications</span>
          </>
        }
        modalDialogClassName={styles.modalDialog}
        header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Last notifications</div>}
      >
        <div className="m-3">
          <table className={`table table-striped table-bordered table-sm mb-0 ${styles.table}`}>
            <thead>
              <tr className={`table-primary ${styles.tableTitle}`}>
                <th scope="col">Notification id</th>
                <th scope="col">Created at</th>
                <th scope="col">Processed</th>
                <th scope="col">Processed at</th>
                <th scope="col">Succeeded</th>
              </tr>
            </thead>
            <tbody>
              {props.notifications.map((item: WebhookNotification) => (
                <tr data-testid="lastNotificationCell" key={`lastNotif_${item.notificationId}`}>
                  <td className="align-middle">{item.notificationId}</td>
                  <td className="align-middle">{moment(item.createdAt * 1000).format('YYYY/MM/DD HH:mm:ss (Z)')}</td>
                  <td className="align-middle text-center">
                    {item.processed && <FaCheck className="text-success" data-testid="processedIcon" />}
                  </td>
                  <td className="align-middle">
                    {!isNull(item.processedAt) && moment(item.processedAt * 1000).format('YYYY/MM/DD HH:mm:ss (Z)')}
                  </td>
                  <td className="align-middle text-center">
                    {item.processed && (
                      <>
                        {item.error ? (
                          <FaTimes className="text-danger" data-testid="failedIcon" />
                        ) : (
                          <FaCheck className="text-success" data-testid="succeededIcon" />
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {notificationsWithErrors.length > 0 && (
            <>
              <div className="h5 mt-5 mb-4 text-upercase font-weight-bold">Errors logs</div>

              <table className={`table table-striped table-bordered table-sm mb-0 ${styles.table}`}>
                <thead>
                  <tr className={`table-primary ${styles.tableTitle}`}>
                    <th scope="col">Notification id</th>
                    <th scope="col">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationsWithErrors.map((item: WebhookNotification) => (
                    <tr data-testid="lastNotificationErrorCell" key={`lastNotifError_${item.notificationId}`}>
                      <td>{item.notificationId}</td>

                      <td>{item.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </Modal>
      {notificationsWithErrors.length > 0 && (
        <FaExclamation className="ml-1 text-warning" data-testid="lastNotifAlert" />
      )}
    </>
  );
};

export default LastNotificationsModal;
