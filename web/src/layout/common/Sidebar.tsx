import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';

import useBodyScroll from '../../hooks/useBodyScroll';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './Sidebar.module.css';

interface Props {
  label: string;
  children: JSX.Element | JSX.Element[];
  header: JSX.Element | JSX.Element[] | string;
  buttonType?: string;
  buttonTitle?: string;
  buttonIcon?: JSX.Element;
  closeButton?: JSX.Element | string;
  leftButton?: JSX.Element;
  className?: string;
  wrapperClassName?: string;
  direction?: 'left' | 'right';
  open?: boolean;
  onOpenStatusChange?: (open: boolean) => void;
}

const DEFAULT_DIRECTION = 'left';

const Sidebar = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(props.open || false);
  const direction = props.direction || DEFAULT_DIRECTION;
  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));
  useBodyScroll(openStatus, 'sidebar');

  const openStatusChange = (open: boolean): void => {
    setOpenStatus(open);
    if (!isUndefined(props.onOpenStatusChange)) {
      props.onOpenStatusChange(open);
    }
  };

  useEffect(() => {
    if (!isUndefined(props.open)) {
      setOpenStatus(props.open);
    }
  }, [props.open]);

  return (
    <aside className={props.className} aria-label={props.label}>
      <button
        type="button"
        className={classnames(
          'font-weight-bold text-uppercase position-relative btn',
          { [`${props.buttonType}`]: !isUndefined(props.buttonType) },
          { 'btn-primary': isUndefined(props.buttonType) }
        )}
        onClick={() => openStatusChange(true)}
        aria-label="Open sidebar"
        aria-expanded={openStatus}
      >
        <div className="d-flex align-items-center justify-content-center">
          {props.buttonIcon && <>{props.buttonIcon}</>}
          {props.buttonTitle && <span>{props.buttonTitle}</span>}
        </div>
      </button>

      {openStatus && <div className={`modal-backdrop ${styles.activeBackdrop}`} />}

      <div
        role="complementary"
        aria-label="Sidebar"
        ref={ref}
        className={classnames('sidebar', styles.sidebar, styles[direction], { [styles.active]: openStatus })}
      >
        <div className="d-flex flex-column h-100">
          <div className="border-bottom p-4 pb-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>{props.header}</div>

              <div>
                <button
                  type="button"
                  className="close"
                  onClick={() => openStatusChange(false)}
                  aria-label="Close sidebar"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            </div>
          </div>

          <div className={`flex-grow-1 d-flex ${styles.contentWrapper} ${props.wrapperClassName}`}>
            <div className="overflow-auto mh-100 w-100 py-3">{props.children}</div>
          </div>

          <div className="mt-auto p-4">
            <div className="d-flex align-items-center justify-content-between">
              {!isUndefined(props.leftButton) && <>{props.leftButton}</>}
              <button
                type="button"
                className="ml-auto btn btn-sm btn-outline-secondary"
                onClick={() => openStatusChange(false)}
                aria-label="Close"
              >
                {isUndefined(props.closeButton) ? <>Close</> : <>{props.closeButton}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
