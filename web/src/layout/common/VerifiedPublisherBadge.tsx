import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { MdVerifiedUser } from 'react-icons/md';

import Label from './Label';
import styles from './VerifiedPublisherBadge.module.css';

interface Props {
  verifiedPublisher?: null | boolean;
  className?: string;
}

const VerifiedPublisherBadge = (props: Props) => {
  const [visibleTooltipStatus, setVisibleTooltipStatus] = useState<boolean>(false);
  const [onLabelHover, setOnLabelHover] = useState<boolean>(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!visibleTooltipStatus && onLabelHover) {
      timeout = setTimeout(() => {
        setVisibleTooltipStatus(true);
      }, 200);
    }
    if (visibleTooltipStatus && !onLabelHover) {
      timeout = setTimeout(() => {
        setVisibleTooltipStatus(false);
      }, 50);
    }
    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
    };
  }, [onLabelHover, visibleTooltipStatus]);

  if (isUndefined(props.verifiedPublisher) || isNull(props.verifiedPublisher) || !props.verifiedPublisher) return null;

  return (
    <div className={props.className}>
      <div
        data-testid="verifiedPublisherBadge"
        onMouseEnter={(e) => {
          e.preventDefault();
          setOnLabelHover(true);
        }}
        onMouseLeave={() => {
          setOnLabelHover(false);
        }}
      >
        <Label text="Verified Publisher" icon={<MdVerifiedUser />} />
      </div>

      {visibleTooltipStatus && (
        <div className="position-absolute">
          <div className={`tooltip bs-tooltip-bottom ${styles.tooltip}`} role="tooltip">
            <div className={`arrow ${styles.tooltipArrow}`} />
            <div className={`tooltip-inner ${styles.tooltipContent}`}>The publisher owns this repository</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifiedPublisherBadge;
