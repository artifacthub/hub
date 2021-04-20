import classnames from 'classnames';
import React, { useRef, useState } from 'react';
import { BiCode } from 'react-icons/bi';
import { HiDotsVertical } from 'react-icons/hi';

import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './MoreActionsButton.module.css';
import WidgetsGroupModal from './WidgetsGroupModal';

const MoreActionsButton = () => {
  const [openStatus, setOpenStatus] = useState(false);
  const [visibleWidget, setVisibleWidget] = useState<boolean>(false);

  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  return (
    <>
      <div className="d-none d-md-block position-relative ml-2">
        <button
          data-testid="moreActionsBtn"
          className="btn p-0 position-relative"
          type="button"
          onClick={() => {
            setOpenStatus(true);
          }}
        >
          <div className="d-flex flex-row align-items-center justify-content-center">
            <div
              className={`rounded-circle d-flex align-items-center justify-content-center text-primary iconSubsWrapper ${styles.iconWrapper}`}
            >
              <HiDotsVertical />
            </div>
          </div>
        </button>

        <div
          ref={ref}
          data-testid="subsBtnDropdown"
          className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdown, { show: openStatus })}
        >
          <div className={`arrow ${styles.arrow}`} />

          <button
            className="dropdown-item btn btn-sm rounded-0 text-secondary"
            onClick={() => {
              setVisibleWidget(true);
              setOpenStatus(false);
            }}
          >
            <div className="d-flex flex-row align-items-center">
              <BiCode className="mr-2" />
              <div>Embed results</div>
            </div>
          </button>
        </div>
      </div>

      <WidgetsGroupModal visibleWidget={visibleWidget} setOpenStatus={setVisibleWidget} />
    </>
  );
};

export default MoreActionsButton;
