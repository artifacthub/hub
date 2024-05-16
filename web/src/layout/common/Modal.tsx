import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import { MouseEvent, MutableRefObject, useEffect, useRef, useState } from 'react';
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
  excludedRefs?: MutableRefObject<HTMLDivElement | null>[];
  breakPoint?: string;
  size?: string;
  unclosable?: boolean;
  visibleContentBackdrop?: boolean;
  footerClassName?: string;
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
            type="button"
            className={classnames(
              'fw-bold text-uppercase position-relative btn w-100',
              styles.btn,
              { [`${props.buttonType}`]: !isUndefined(props.buttonType) },
              { 'btn-primary': isUndefined(props.buttonType) },
              { disabled: !isUndefined(props.disabledOpenBtn) && props.disabledOpenBtn }
            )}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              if (isUndefined(props.disabledOpenBtn) || !props.disabledOpenBtn) {
                setOpenStatus(true);
              }
            }}
            aria-label="Open modal"
          >
            <div className="d-flex align-items-center justify-content-center">{props.buttonContent}</div>
          </button>
        </div>
      )}

      {openStatus && <div className={`modal-backdrop ${styles.activeBackdrop}`} data-testid="modalBackdrop" />}

      <div
        className={classnames('modal', styles.modal, { [`${styles.active} d-block`]: openStatus })}
        role="dialog"
        aria-modal={openStatus}
      >
        <div
          className={classnames(
            `modal-dialog modal-${props.size || 'lg'}`,
            { 'modal-dialog-centered modal-dialog-scrollable': isUndefined(props.noScrollable) || !props.noScrollable },
            props.modalDialogClassName
          )}
          ref={ref}
        >
          <div
            className={classnames('modal-content border border-3 mx-auto', styles.content, props.modalClassName, {
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
                    type="button"
                    className="btn-close"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      closeModal();
                    }}
                    disabled={props.disabledClose}
                    aria-label="Close"
                  ></button>
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
              <div className={`modal-footer p-3 ${props.footerClassName}`}>
                {isUndefined(props.closeButton) ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary text-uppercase"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      closeModal();
                    }}
                    disabled={props.disabledClose}
                    aria-label="Close modal"
                  >
                    <div className="d-flex flex-row align-items-center">
                      <MdClose className="me-2" />
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
