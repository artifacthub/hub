import classnames from 'classnames';
import isNull from 'lodash/isNull';
import React, { useState } from 'react';

import { Alert } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import styles from './AlertController.module.css';

const AlertController = () => {
  const [alert, setAlert] = useState<Alert | null>(null);

  alertDispatcher.subscribe({
    updateAlertWrapper: (alert: Alert | null) => setAlert(alert),
  });

  const onClose = () => {
    alertDispatcher.postAlert(null);
  };

  return (
    <div className="position-relative">
      <div
        data-testid="alertController"
        className={classnames(
          `alert alert-dismissible position-fixed`,
          `alert-${!isNull(alert) && alert.type ? alert.type : 'warning'}`,
          styles.alert,
          { [`show ${styles.active}`]: !isNull(alert) },
          { fade: isNull(alert) }
        )}
        role="alert"
      >
        {!isNull(alert) && <>{alert.message}</>}

        <button type="button" className="close" onClick={onClose}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  );
};

export default AlertController;
