import classnames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { BiCode } from 'react-icons/bi';
import { HiDotsVertical } from 'react-icons/hi';

import useOutsideClick from '../../hooks/useOutsideClick';
import { SearchFiltersURL } from '../../types';
import styles from './MoreActionsButton.module.css';
import WidgetModal from './WidgetModal';

interface Props {
  packageId: string;
  packageName: string;
  packageDescription: string;
  visibleWidget: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const MoreActionsButton = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const [visibleWidget, setVisibleWidget] = useState<boolean>(props.visibleWidget);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);

  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  useEffect(() => {
    if (props.packageId !== currentPkgId && openStatus) {
      setVisibleWidget(false);
      setCurrentPkgId(props.packageId);
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

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
              <div>Embed widget</div>
            </div>
          </button>
        </div>
      </div>

      <WidgetModal {...props} visibleWidget={visibleWidget} setOpenStatus={setVisibleWidget} />
    </>
  );
};

export default MoreActionsButton;
