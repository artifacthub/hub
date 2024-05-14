import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { MouseEvent as ReactMouseEvent, useEffect, useState } from 'react';
import { FiCopy } from 'react-icons/fi';

import styles from './ButtonCopyToClipboard.module.css';

interface Props {
  text: string;
  wrapperClassName?: string;
  arrowClassName?: string;
  className?: string;
  tooltipClassName?: string;
  visibleBtnText?: boolean;
  contentBtn?: string;
  style?: { [key: string]: string };
  icon?: JSX.Element;
  disabled?: boolean;
  label?: string;
  title?: string;
  tooltipType?: 'normal' | 'light';
  noTooltip?: boolean;
  onClick?: () => void;
}

const ButtonCopyToClipboard = (props: Props) => {
  const [copyStatus, setCopyStatus] = useState(false);

  async function copyToClipboard(textToCopy: string) {
    if (!navigator.clipboard) {
      try {
        const textField = document.createElement('textarea');
        textField.textContent = textToCopy;
        document.body.appendChild(textField);
        textField.select();
        document.execCommand('copy');
        textField.remove();
        if (isUndefined(props.noTooltip) || !props.noTooltip) {
          setCopyStatus(true);
        }
      } catch {
        setCopyStatus(false);
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToCopy);
        if (isUndefined(props.noTooltip) || !props.noTooltip) {
          setCopyStatus(true);
        }
      } catch {
        setCopyStatus(false);
      }
    }
  }

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (copyStatus) {
      // Hide tooltip after 2s
      timeout = setTimeout(() => setCopyStatus(false), 2 * 1000);
    }

    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
    };
  }, [copyStatus]);

  return (
    <div className={`position-relative ${props.wrapperClassName}`}>
      {copyStatus && (
        <div
          className={classnames(
            'tooltip bs-tooltip-bottom show end-0',
            styles.tooltip,
            props.tooltipClassName,
            {
              [styles.isDark]: isUndefined(props.tooltipType) || props.tooltipType !== 'light',
            },
            {
              [styles.isLight]: !isUndefined(props.tooltipType) && props.tooltipType === 'light',
            }
          )}
          role="tooltip"
        >
          <div className={`tooltip-arrow ${styles.tooltipArrow} ${props.arrowClassName}`} />
          <div className={`tooltip-inner ${styles.tooltipContent}`}>Copied!</div>
        </div>
      )}
      <button
        type="button"
        className={classnames(
          'btn btn-sm',
          { [`btn-primary ${styles.btn}`]: isUndefined(props.className) },
          props.className
        )}
        style={props.style}
        onClick={(e: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => {
          e.preventDefault();
          e.stopPropagation();
          copyToClipboard(props.text);
          if (props.onClick) {
            props.onClick();
          }
        }}
        disabled={props.disabled}
        aria-label={props.label || 'Copy to clipboard'}
        title={props.title}
      >
        <div className="d-flex flex-row align-items-center" aria-hidden="true">
          {!isUndefined(props.visibleBtnText) && props.visibleBtnText && props.contentBtn && (
            <div className="me-2">{props.contentBtn}</div>
          )}
          {props.icon ? <>{props.icon}</> : <FiCopy />}
          {!isUndefined(props.visibleBtnText) && props.visibleBtnText && isUndefined(props.contentBtn) && (
            <div className="ms-2">Copy to clipboard</div>
          )}
        </div>
      </button>
    </div>
  );
};

export default ButtonCopyToClipboard;
