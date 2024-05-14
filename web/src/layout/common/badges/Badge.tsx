import classNames from 'classnames';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';
import { MdClose } from 'react-icons/md';

import useOutsideClick from '../../../hooks/useOutsideClick';
import Modal from '../Modal';
import styles from './Badge.module.css';

interface Props {
  title: string;
  active?: boolean | null;
  icon: JSX.Element;
  className?: string;
  bgColor?: string;
  popoverContent?: JSX.Element;
  dropdownAlignment?: 'start' | 'end';
  noDropdown?: boolean;
  smallSize?: boolean;
}

const Badge = (props: Props) => {
  const isActive = !isUndefined(props.active) && !isNull(props.active) && props.active;
  const ref = useRef(null);
  const [openStatus, setOpenStatus] = useState(false);
  const [openModalStatus, setOpenModalStatus] = useState<boolean>(false);
  const [onLinkHover, setOnLinkHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!openStatus && (onLinkHover || onDropdownHover)) {
      timeout = setTimeout(() => {
        setOpenStatus(true);
      }, 100);
    }
    if (openStatus && !onLinkHover && !onDropdownHover) {
      timeout = setTimeout(() => {
        // Delay to hide the dropdown to let some time for changing between dropdown and link (for copying text)
        setOpenStatus(false);
      }, 50);
    }
    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
    };
  }, [onLinkHover, onDropdownHover, openStatus]);

  return (
    <div data-testid={`${props.title} badge`}>
      <div className={`d-none d-md-block position-relative ${props.className}`}>
        {(isUndefined(props.noDropdown) || !props.noDropdown) && (
          <div className="position-absolute">
            <div
              ref={ref}
              role="complementary"
              className={classnames(
                'dropdown-menu dropdown-menu-end text-wrap',
                styles.dropdown,
                {
                  'dropdown-menu-end': isUndefined(props.dropdownAlignment) || props.dropdownAlignment === 'end',
                },
                {
                  [`dropdown-menu-start ${styles.dropdownStart}`]:
                    !isUndefined(props.dropdownAlignment) && props.dropdownAlignment === 'start',
                },
                {
                  show: openStatus,
                }
              )}
              onMouseEnter={() => setOnDropdownHover(true)}
              onMouseLeave={() => setOnDropdownHover(false)}
            >
              <div className={styles.content}>{props.popoverContent}</div>
            </div>
          </div>
        )}

        <div
          style={{
            backgroundColor: isActive && !isUndefined(props.bgColor) ? props.bgColor : undefined,
          }}
          className={classNames(
            'border',
            styles.label,
            { [styles.small]: !isUndefined(props.smallSize) && props.smallSize },
            {
              [styles.active]: isActive,
            }
          )}
          onMouseEnter={(e) => {
            e.preventDefault();
            setOnLinkHover(true);
          }}
          onMouseLeave={() => {
            setOnLinkHover(false);
          }}
        >
          <div className="d-flex flex-row align-items-center justify-content-center w-100 h-100">
            <div className={styles.icon}>{props.icon}</div>
          </div>
        </div>
      </div>
      <div className={`d-block d-md-none ${props.className}`}>
        <div
          role="button"
          style={{
            backgroundColor: isActive && !isUndefined(props.bgColor) ? props.bgColor : undefined,
          }}
          className={classNames(
            'border',
            styles.label,
            { [styles.small]: !isUndefined(props.smallSize) && props.smallSize },
            {
              [styles.active]: isActive,
            }
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpenModalStatus(true);
          }}
        >
          <div className="d-flex flex-row align-items-center justify-content-center w-100 h-100">
            <div className={styles.icon}>{props.icon}</div>
          </div>
        </div>

        {(isUndefined(props.noDropdown) || !props.noDropdown) && (
          <Modal
            closeButton={
              <div
                role="button"
                className="btn btn-sm btn-outline-secondary text-uppercase"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenModalStatus(false);
                }}
                aria-label="Close modal"
              >
                <div className="d-flex flex-row align-items-center">
                  <MdClose className="me-2" />
                  <div>Close</div>
                </div>
              </div>
            }
            onClose={() => setOpenModalStatus(false)}
            open={openModalStatus}
          >
            <div className={styles.modal}>{props.popoverContent}</div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Badge;
