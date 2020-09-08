import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';

import styles from './LabelWithTooltip.module.css';

interface Props {
  active?: boolean | null;
  label: JSX.Element;
  visibleTooltip: boolean;
  tooltipMessage: string;
  className?: string;
}

const LabelWithTooltip = (props: Props) => {
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

  if (isUndefined(props.active) || isNull(props.active) || !props.active) return null;

  return (
    <div className={props.className}>
      <div
        data-testid="labelWithTooltip"
        onMouseEnter={(e) => {
          e.preventDefault();
          setOnLabelHover(true);
        }}
        onMouseLeave={() => {
          setOnLabelHover(false);
        }}
      >
        {props.label}
      </div>

      {props.visibleTooltip && visibleTooltipStatus && (
        <div className="position-absolute">
          <div className={`tooltip bs-tooltip-bottom ${styles.tooltip}`} role="tooltip">
            <div className={`arrow ${styles.tooltipArrow}`} />
            <div className={`tooltip-inner ${styles.tooltipContent}`}>{props.tooltipMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelWithTooltip;
