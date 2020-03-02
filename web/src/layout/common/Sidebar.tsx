import React, { useState, useRef } from 'react';
import isUndefined from 'lodash/isUndefined';
import classnames from 'classnames';
import useOutsideClick from '../../hooks/useOutsideClick';
import useBodyScroll from '../../hooks/useBodyScroll';
import styles from './Sidebar.module.css';

interface Props {
  children: JSX.Element | JSX.Element[];
  header: JSX.Element | JSX.Element[] | string;
  buttonType?: string;
  buttonTitle?: string;
  buttonIcon?: JSX.Element;
  closeButton?: JSX.Element | string;
  className?: string;
  direction?: 'left' | 'right';
}

const DEFAULT_DIRECTION = 'left';

const Sidebar = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const direction = props.direction || DEFAULT_DIRECTION;
  const ref = useRef(null);
  useOutsideClick([ref], () => setOpenStatus(false));
  useBodyScroll(openStatus);

  return (
    <div role="complementary" className={props.className}>
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

      <div
        ref={ref}
        className={classnames(
        'p-4',
        styles.sidebar,
        styles[direction],
        {[styles.active]: openStatus},
      )}>
        <div className="d-flex flex-column h-100">
          <div className="border-bottom pb-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>{props.header}</div>

              <div>
                <button type="button" className="close" onClick={() => setOpenStatus(false)}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            </div>
          </div>

          <div className={`flex-grow-1 d-flex ${styles.contentWrapper}`}>
            <div className="overflow-auto mh-100 w-100 py-3">
              {props.children}
            </div>
          </div>

          <div className="mt-auto pt-4 text-right">
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
  );
}

export default Sidebar;
