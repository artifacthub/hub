import classnames from 'classnames';
import { isNull } from 'lodash';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useRef, useState } from 'react';
import { MdClose } from 'react-icons/md';

import useBodyScroll from '../../hooks/useBodyScroll';
import useOutsideClick from '../../hooks/useOutsideClick';
import Alert from './Alert';
import styles from './Modal.module.css';

interface Props {
  children: JSX.Element | JSX.Element[];
  buttonType?: string;
  buttonContent?: string | JSX.Element;
  header?: JSX.Element | string;
  headerClassName?: string;
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
  breakPoint?: string;
  size?: string;
  unclosable?: boolean;
  visibleContentBackdrop?: boolean;
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(props.open || false);
  const ref = useRef<HTMLDivElement>(null);
  const unclosable = !isUndefined(props.unclosable) && props.unclosable;
  useOutsideClick(
    [ref, ...(!isUndefined(props.excludedRefs) ? [...props.excludedRefs] : [])],
    openStatus && !unclosable,
    () => {
      closeModal();
    }
  );
  useBodyScroll(openStatus, 'modal', props.breakPoint);

  const closeModal = () => {
    if (isUndefined(props.disabledClose) || !props.disabledClose) {
      setOpenStatus(false);
      if (!isUndefined(props.onClose)) {
        props.onClose();
      }
      if (props.error && !isNull(props.error) && props.cleanError) {
        props.cleanError();
      }
    }
  };

  useEffect(() => {
    if (!isUndefined(props.open)) {
      setOpenStatus(props.open);
    }
  }, [props.open]);

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
            `modal-dialog modal-${props.size || 'lg'}`,
            { 'modal-dialog-centered modal-dialog-scrollable': isUndefined(props.noScrollable) || !props.noScrollable },
            props.modalDialogClassName
          )}
          ref={ref}
        >
          <div
            className={classnames('modal-content', styles.content, props.modalClassName, {
              [`position-relative ${styles.visibleContentBackdrop}`]:
                !isUndefined(props.visibleContentBackdrop) && props.visibleContentBackdrop,
            })}
          >
            {!isUndefined(props.header) && (
              <div
                className={`modal-header d-flex flex-row align-items-center ${styles.header} ${props.headerClassName}`}
              >
                {isString(props.header) ? <div className="modal-title h5">{props.header}</div> : <>{props.header}</>}

                {!unclosable && (
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
                )}
              </div>
            )}

            <div className="modal-body p-4 h-100 d-flex flex-column">
              {openStatus && <>{props.children}</>}
              <div>
                <Alert message={props.error || null} type="danger" onClose={props.cleanError} />
              </div>
            </div>

            {(isUndefined(props.noFooter) || !props.noFooter) && (
              <div className="modal-footer p-3">
                {isUndefined(props.closeButton) ? (
                  <button
                    data-testid="closeModalFooterBtn"
                    type="button"
                    className="btn btn-sm btn-secondary text-uppercase"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      closeModal();
                    }}
                    disabled={props.disabledClose}
                  >
                    <div className="d-flex flex-row align-items-center">
                      <MdClose className="mr-2" />
                      <div>Close</div>
                    </div>
                  </button>
                ) : (
                  <>{props.closeButton}</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
