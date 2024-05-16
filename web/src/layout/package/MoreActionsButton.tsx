import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { useEffect, useRef, useState } from 'react';
import { BiCode } from 'react-icons/bi';
import { GoStop } from 'react-icons/go';
import { HiDotsVertical } from 'react-icons/hi';

import useOutsideClick from '../../hooks/useOutsideClick';
import getMetaTag from '../../utils/getMetaTag';
import styles from './MoreActionsButton.module.css';
import WidgetModal from './WidgetModal';

interface Props {
  packageId: string;
  packageName: string;
  packageDescription: string;
  visibleWidget: boolean;
}

const MoreActionsButton = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const [visibleWidget, setVisibleWidget] = useState<boolean>(props.visibleWidget);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);
  const reportURL = getMetaTag('reportURL');

  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  useEffect(() => {
    if (props.packageId !== currentPkgId && openStatus) {
      setVisibleWidget(false);
      setCurrentPkgId(props.packageId);
    }
  }, [props.packageId]);

  return (
    <>
      <div className="d-none d-lg-block position-relative ms-2">
        <button
          className={`btn btn-outline-primary p-0 position-relative lh-1 fs-5 ${styles.iconWrapper}`}
          type="button"
          onClick={() => {
            setOpenStatus(true);
          }}
          aria-label="Open menu"
          aria-expanded={openStatus}
        >
          <HiDotsVertical />
        </button>

        <div
          ref={ref}
          role="menu"
          className={classnames('dropdown-menu dropdown-menu-end p-0', styles.dropdown, { show: openStatus })}
        >
          <div className={`dropdown-arrow ${styles.arrow}`} />

          <button
            className="dropdown-item btn btn-sm rounded-0 text-dark"
            onClick={() => {
              setVisibleWidget(true);
              setOpenStatus(false);
            }}
            aria-label="Open embed widget modal"
          >
            <div className="d-flex flex-row align-items-center">
              <BiCode className={`me-2 position-relative ${styles.icon}`} />
              <div>Embed widget</div>
            </div>
          </button>

          {!isNull(reportURL) && reportURL !== '' && (
            <button
              className="dropdown-item btn btn-sm rounded-0 text-dark"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.open(reportURL, '_blank');
                setOpenStatus(false);
              }}
              aria-label="Open report abuse url"
            >
              <div className="d-flex flex-row align-items-center">
                <GoStop className={`me-2 position-relative ${styles.icon}`} />
                <div>Report abuse</div>
              </div>
            </button>
          )}
        </div>
      </div>

      <WidgetModal {...props} visibleWidget={visibleWidget} setOpenStatus={setVisibleWidget} />
    </>
  );
};

export default MoreActionsButton;
