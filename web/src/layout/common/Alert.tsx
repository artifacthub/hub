import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';

import styles from './Alert.module.css';

interface Props {
  message: string | null;
  type?: 'danger' | 'warning' | 'success';
  onClose?: () => void;
}

const DEFAULT_ALERT_TYPE = 'warning';

const Alert: React.ElementType = (props: Props) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorWrapper = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isNull(props.message)) {
      if (!isNull(errorMessage)) {
        setIsVisible(false);
        timeout = setTimeout(() => {
          setErrorMessage(null);
        }, 1000);
      }
    } else {
      if (props.message !== errorMessage) {
        setErrorMessage(props.message);
        setIsVisible(true);
        errorWrapper.current!.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
      }
    }

    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
    };
  }, [props.message]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div
      data-testid="alertWrapper"
      className={classnames(styles.alertWrapper, { [styles.isAlertActive]: isVisible })}
      ref={errorWrapper}
    >
      {isVisible && (
        <div className={`alert alert-${props.type || DEFAULT_ALERT_TYPE} mt-3 mb-0`} role="alert">
          <div className="d-flex flex-row align-items-start justify-content-between">
            <div>{errorMessage || ''}</div>
            {!isUndefined(props.onClose) && (
              <button data-testid="closeAlertBtn" type="button" className="close ml-3" onClick={props.onClose}>
                <span aria-hidden="true">&times;</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alert;
