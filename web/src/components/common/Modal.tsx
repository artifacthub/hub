import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import isString from 'lodash/isString';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './Modal.module.css';

interface Props {
  children: JSX.Element | JSX.Element[];
  buttonTitle: string;
  header: JSX.Element | string;
  className?: string;
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], () => setOpenStatus(false));

  return (
    <div className={props.className}>
      <button
        type="button"
        className={classnames(
          'btn btn-primary btn-block font-weight-bold text-uppercase position-relative',
        )}
        onClick={() => setOpenStatus(true)}
      >
        {props.buttonTitle}
      </button>

      {openStatus && <div className={`modal-backdrop fade ${styles.activeBackdrop}`} />}

      <div className={classnames(
          'modal fade',
          styles.modal,
          {[`${styles.active} d-block`]: openStatus},
        )}
        role="dialog"
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" ref={ref}>
          <div className="modal-content">
            <div className={`modal-header ${styles.header}`}>
              {isString(props.header) ? (
                <h5 className="modal-title">{props.header}</h5>
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
              <button type="button" className="btn btn-secondary" onClick={() => setOpenStatus(false)}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
