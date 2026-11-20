import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ElementType, useEffect, useRef, useState } from 'react';

import styles from './Alert.module.css';

interface Props {
  message: string | null;
  type?: 'danger' | 'warning' | 'success';
  onClose?: () => void;
}

const DEFAULT_ALERT_TYPE = 'warning';

const Alert: ElementType = (props: Props) => {
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
      // The alert may have just been closed while still holding this message
      if (props.message !== errorMessage || !isVisible) {
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
  }, [props.message]);

  // When the message is set the alert has no height yet, so the call above
  // cannot bring all of it into view: follow it while it opens
  useEffect(() => {
    const wrapper = errorWrapper.current;
    if (!isVisible || isNull(wrapper) || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      wrapper.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    observer.observe(wrapper);
    const stopObserving = (e: TransitionEvent) => {
      if (e.target === wrapper) {
        observer.disconnect();
      }
    };
    wrapper.addEventListener('transitionend', stopObserving);

    return () => {
      wrapper.removeEventListener('transitionend', stopObserving);
      observer.disconnect();
    };
  }, [isVisible, errorMessage]);

  return (
    <div
      data-testid="alertWrapper"
      className={classnames('overflow-hidden', styles.alertWrapper, { [styles.isAlertActive]: isVisible })}
      ref={errorWrapper}
    >
      {isVisible && (
        <div className={`alert alert-${props.type || DEFAULT_ALERT_TYPE} mt-3 mb-0`} role="alert">
          <div className="d-flex flex-row align-items-start justify-content-between">
            <div>{errorMessage || ''}</div>
            {!isUndefined(props.onClose) && (
              <button
                data-testid="closeAlertBtn"
                type="button"
                className="btn-close ms-3"
                onClick={props.onClose}
                aria-label="Close alert"
              ></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alert;
