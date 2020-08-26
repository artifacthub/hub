import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useRef, useState } from 'react';

import useBodyScroll from '../../hooks/useBodyScroll';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './Modal.module.css';

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
  error?: string | null;
  cleanError?: () => void;
  noFooter?: boolean;
  noScrollable?: boolean;
  disabledOpenBtn?: boolean;
  tooltipMessage?: string;
  excludedRefs?: React.MutableRefObject<HTMLDivElement | null>[];
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(props.open || false);
  const ref = useRef<HTMLDivElement>(null);
  const errorWrapper = useRef<HTMLDivElement>(null);
  useOutsideClick([ref, ...(!isUndefined(props.excludedRefs) ? [...props.excludedRefs] : [])], openStatus, () => {
    closeModal();
  });
  useBodyScroll(openStatus, 'modal');

  const closeModal = () => {
    if (isUndefined(props.disabledClose) || !props.disabledClose) {
      setOpenStatus(false);
      if (!isUndefined(props.onClose)) {
        props.onClose();
      }
    }
  };

  useEffect(() => {
    if (!isUndefined(props.open)) {
      setOpenStatus(props.open);
    }
  }, [props.open]);

  useEffect(() => {
    if (!isUndefined(props.error) && !isNull(props.error)) {
      errorWrapper.current!.scrollIntoView({ behavior: 'smooth' });
    }
  }, [props.error]);

  return (
    <div className={props.className}>
      {!isUndefined(props.buttonContent) && (
        <div className={`position-relative ${styles.buttonWrapper}`}>
          <button
            data-testid="openModalBtn"
            type="button"
            className={classnames(
              'font-weight-bold text-uppercase position-relative btn btn-block',
              styles.btn,
              { [`${props.buttonType}`]: !isUndefined(props.buttonType) },
              { 'btn-primary': isUndefined(props.buttonType) },
              { disabled: !isUndefined(props.disabledOpenBtn) && props.disabledOpenBtn }
            )}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              if (isUndefined(props.disabledOpenBtn) || !props.disabledOpenBtn) {
                setOpenStatus(true);
              }
            }}
          >
            <div className="d-flex align-items-center justify-content-center">{props.buttonContent}</div>
          </button>
          {!isUndefined(props.tooltipMessage) && (
            <div className={`tooltip bs-tooltip-bottom ${styles.tooltip}`} role="tooltip">
              <div className={`arrow ${styles.tooltipArrow}`} />
              <div className={`tooltip-inner ${styles.tooltipContent}`}>{props.tooltipMessage}</div>
            </div>
          )}
        </div>
      )}

      {openStatus && <div className={`modal-backdrop ${styles.activeBackdrop}`} data-testid="modalBackdrop" />}

      <div className={classnames('modal', styles.modal, { [`${styles.active} d-block`]: openStatus })} role="dialog">
        <div
          className={classnames(
            'modal-dialog modal-lg',
            { 'modal-dialog-centered modal-dialog-scrollable': isUndefined(props.noScrollable) || !props.noScrollable },
            props.modalDialogClassName
          )}
          ref={ref}
        >
          <div className={`modal-content ${styles.content} ${props.modalClassName}`}>
            <div className={`modal-header d-flex flex-row align-items-center ${styles.header}`}>
              {isString(props.header) ? <div className="modal-title h5">{props.header}</div> : <>{props.header}</>}

              <button
                data-testid="closeModalBtn"
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
              {!isUndefined(props.error) && !isNull(props.error) && (
                <div className={`alert alert-danger mt-3 ${styles.errorAlert}`} role="alert" ref={errorWrapper}>
                  <div className="d-flex flex-row align-items-start justify-content-between">
                    <div>{props.error}</div>
                    <button
                      data-testid="closeModalErrorBtn"
                      type="button"
                      className="close ml-3"
                      onClick={() => {
                        if (!isUndefined(props.cleanError)) {
                          props.cleanError();
                        }
                      }}
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer p-3">
              {isUndefined(props.closeButton) ? (
                <button
                  data-testid="closeModalFooterBtn"
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
};

export default Modal;
