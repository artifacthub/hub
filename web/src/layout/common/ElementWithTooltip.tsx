import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';

import styles from './ElementWithTooltip.module.css';

interface Props {
  active?: boolean | null;
  element: JSX.Element;
  visibleTooltip: boolean;
  tooltipMessage: string | JSX.Element;
  className?: string;
  tooltipClassName?: string;
  tooltipArrowClassName?: string;
  alignmentTooltip?: 'right' | 'left';
}

const ElementWithTooltip = (props: Props) => {
  const [visibleTooltipStatus, setVisibleTooltipStatus] = useState<boolean>(false);
  const [onLabelHover, setOnLabelHover] = useState<boolean>(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!visibleTooltipStatus && onLabelHover) {
      timeout = setTimeout(() => {
        setVisibleTooltipStatus(true);
      }, 500);
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
    <div className={`position-relative ${props.className}`}>
      <div
        data-testid="elementWithTooltip"
        onMouseEnter={(e) => {
          e.preventDefault();
          setOnLabelHover(true);
        }}
        onMouseLeave={() => {
          setOnLabelHover(false);
        }}
      >
        {props.element}
      </div>

      {props.visibleTooltip && visibleTooltipStatus && (
        <div
          className={classnames('position-absolute d-none d-md-block', {
            [styles.rightAligned]: !isUndefined(props.alignmentTooltip) && props.alignmentTooltip === 'right',
          })}
        >
          <div className={`tooltip bs-tooltip-bottom ${styles.tooltip} ${props.tooltipClassName}`} role="tooltip">
            <div className={`arrow ${styles.tooltipArrow} ${props.tooltipArrowClassName}`} />
            <div className={`tooltip-inner ${styles.tooltipContent}`}>
              <>{props.tooltipMessage}</>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElementWithTooltip;
