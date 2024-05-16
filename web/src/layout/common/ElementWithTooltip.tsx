import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import styles from './ElementWithTooltip.module.css';

interface Props {
  active?: boolean | null;
  element: JSX.Element;
  wrapperElement?: string;
  visibleTooltip: boolean;
  tooltipMessage: string | JSX.Element;
  className?: string;
  tooltipClassName?: string;
  tooltipArrowClassName?: string;
  alignmentTooltip?: 'right' | 'left';
  tooltipWidth?: number;
}

const DEFAULT_TOOLTIP_WIDTH = 150;
const DEFAULT_MARGIN = 30;

const ElementWithTooltip = (props: Props) => {
  const tooltipWidth: number = props.tooltipWidth || DEFAULT_TOOLTIP_WIDTH;
  const wrapper = useRef<HTMLDivElement | null>(null);
  const [visibleTooltipStatus, setVisibleTooltipStatus] = useState<boolean>(false);
  const [onLabelHover, setOnLabelHover] = useState<boolean>(false);
  const [tooltipAlignment, setTooltipAlignment] = useState<'right' | 'left' | 'center'>('center');
  const [elWidth, setElWidth] = useState<number>(0);

  useEffect(() => {
    const calculateTooltipPosition = () => {
      if (wrapper && wrapper.current) {
        const windowWidth = window.innerWidth;
        const bounding = wrapper.current.getBoundingClientRect();
        setElWidth(bounding.width);
        const overflowTooltip = (tooltipWidth - elWidth) / 2;
        if (
          DEFAULT_MARGIN + bounding.right + overflowTooltip < windowWidth &&
          bounding.left - overflowTooltip - DEFAULT_MARGIN > 0
        ) {
          setTooltipAlignment('center');
        } else if (windowWidth - bounding.right - DEFAULT_MARGIN < tooltipWidth - bounding.width) {
          setTooltipAlignment('right');
        } else {
          setTooltipAlignment('left');
        }
      }
    };

    let timeout: NodeJS.Timeout;
    if (!visibleTooltipStatus && onLabelHover) {
      calculateTooltipPosition();
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
  }, [onLabelHover, visibleTooltipStatus, tooltipWidth]);

  useLayoutEffect(() => {
    if (wrapper && wrapper.current) {
      setElWidth(wrapper.current.clientWidth);
    }
  }, []);

  const WrapperElement = (props.wrapperElement || 'div') as keyof JSX.IntrinsicElements;

  if (isUndefined(props.active) || isNull(props.active) || !props.active) return null;

  return (
    <WrapperElement className={`position-relative ${props.className}`}>
      <div
        ref={wrapper}
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
          className={`position-absolute d-none d-md-block ${styles[`${tooltipAlignment}Aligned`]}`}
          style={{
            left: tooltipAlignment === 'center' ? `${-(tooltipWidth - elWidth) / 2}px` : 'auto',
          }}
        >
          <div
            className={`tooltip bs-tooltip-bottom ${styles.tooltip} ${props.tooltipClassName}`}
            role="tooltip"
            style={{ width: `${tooltipWidth}px` }}
          >
            <div className={`tooltip-arrow ${styles.tooltipArrow} ${props.tooltipArrowClassName}`} />
            <div className={`tooltip-inner mw-100 ${styles.tooltipContent}`}>
              <>{props.tooltipMessage}</>
            </div>
          </div>
        </div>
      )}
    </WrapperElement>
  );
};

export default ElementWithTooltip;
