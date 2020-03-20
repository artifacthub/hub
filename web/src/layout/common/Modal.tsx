import React, { useState, useRef, useEffect } from 'react';
import classnames from 'classnames';
import isString from 'lodash/isString';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './Modal.module.css';
import isUndefined from 'lodash/isUndefined';
import useBodyScroll from '../../hooks/useBodyScroll';

interface Props {
  children: JSX.Element | JSX.Element[];
  buttonType?: string;
  buttonContent?: string | JSX.Element;
  header: JSX.Element | string;
  closeButton?: JSX.Element;
  className?: string;
  modalClassName?: string;
  modalDialogClassName?: string;
  open?: boolean;
  disabledClose?: boolean;
  onClose?: () => void;
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(props.open || false);
  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => {
    closeModal();
  });
  useBodyScroll(openStatus);

  const closeModal = () => {
    if (isUndefined(props.disabledClose) || !props.disabledClose) {
      setOpenStatus(false);
      if (!isUndefined(props.onClose)) {
        props.onClose();
      }
    }
  }

  useEffect(() => {
    if (!isUndefined(props.open)) {
      setOpenStatus(props.open);
    }
  }, [props.open]);

  return (
    <div className={props.className}>
      {!isUndefined(props.buttonContent) && (
        <button
          type="button"
          className={classnames(
            'font-weight-bold text-uppercase position-relative btn btn-block',
            {[`${props.buttonType}`]: !isUndefined(props.buttonType)},
            {'btn-primary': isUndefined(props.buttonType)},
          )}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setOpenStatus(true);
          }}
        >
          <div className="d-flex align-items-center justify-content-center">
            {props.buttonContent}
          </div>
        </button>
      )}

      {openStatus && <div className={`modal-backdrop ${styles.activeBackdrop}`} />}

      <div className={classnames(
          'modal',
          styles.modal,
          {[`${styles.active} d-block`]: openStatus},
        )}
        role="dialog"
      >
        <div className={`modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable ${props.modalDialogClassName}`} ref={ref}>
          <div className={`modal-content ${styles.content} ${props.modalClassName}`}>
            <div className={`modal-header ${styles.header}`}>
              {isString(props.header) ? (
                <div className="modal-title h5">{props.header}</div>
              ) : (
                <>{props.header}</>
              )}

              <button
                type="button"
                className="close"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  closeModal();
                }}
                disabled={props.disabledClose}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body p-4 h-100 d-flex flex-column">
              {openStatus && <>{props.children}</>}
            </div>

            <div className="modal-footer p-3">
              {isUndefined(props.closeButton) ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeModal();
                  }}
                  disabled={props.disabledClose}
                >
                  Close
                </button>
              ) : (
                <>{props.closeButton}</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
