import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import isString from 'lodash/isString';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './Modal.module.css';
import isUndefined from 'lodash/isUndefined';
import useBodyScroll from '../../hooks/useBodyScroll';

interface Props {
  children: JSX.Element | JSX.Element[];
  buttonType?: string;
  buttonTitle?: string;
  buttonIcon?: JSX.Element;
  header: JSX.Element | string;
  closeButton?: JSX.Element | string;
  className?: string;
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], () => setOpenStatus(false));
  useBodyScroll(openStatus);

  return (
    <div className={props.className}>
      <button
        type="button"
        className={classnames(
          'font-weight-bold text-uppercase position-relative btn btn-block',
          {[`${props.buttonType}`]: !isUndefined(props.buttonType)},
          {'btn-primary': isUndefined(props.buttonType)},
        )}
        onClick={() => setOpenStatus(true)}
      >
        <div className="d-flex align-items-center justify-content-center">
          {props.buttonIcon && <>{props.buttonIcon}</>}
          {props.buttonTitle && <span>{props.buttonTitle}</span>}
        </div>
      </button>

      {openStatus && <div className={`modal-backdrop ${styles.activeBackdrop}`} />}

      <div className={classnames(
          'modal',
          styles.modal,
          {[`${styles.active} d-block`]: openStatus},
        )}
        role="dialog"
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" ref={ref}>
          <div className={`modal-content ${styles.content}`}>
            <div className={`modal-header ${styles.header}`}>
              {isString(props.header) ? (
                <div className="modal-title h5">{props.header}</div>
              ) : (
                <>{props.header}</>
              )}

              <button type="button" className="close" onClick={() => setOpenStatus(false)}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body p-4">
              {props.children}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpenStatus(false)}
              >
                {isUndefined(props.closeButton) ? (
                  <>Close</>
                ) : (
                  <>{props.closeButton}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
