import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React, { useState } from 'react';
import { FiCopy } from 'react-icons/fi';

import styles from './ButtonCopyToClipboard.module.css';

interface Props {
  text: string;
  wrapperClassName?: string;
  arrowClassName?: string;
  className?: string;
  tooltipClassName?: string;
  visibleBtnText?: boolean;
}

const copyToClipboard = (text: string): boolean => {
  try {
    const textField = document.createElement('textarea');
    textField.innerHTML = text;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    textField.remove();
    return true;
  } catch {
    return false;
  }
};

const ButtonCopyToClipboard = (props: Props) => {
  const [copyStatus, setCopyStatus] = useState(false);

  // Hide tooltip after 2s
  if (copyStatus) {
    setTimeout(() => setCopyStatus(false), 2 * 1000);
  }

  return (
    <div className={`position-relative ${props.wrapperClassName}`}>
      {copyStatus && (
        <div className={`tooltip bs-tooltip-bottom show ${styles.tooltip} ${props.tooltipClassName}`} role="tooltip">
          <div className={`arrow ${styles.tooltipArrow} ${props.arrowClassName}`} />
          <div className={`tooltip-inner ${styles.tooltipContent}`}>Copied!</div>
        </div>
      )}
      <button
        data-testid="ctcBtn"
        type="button"
        className={classnames(
          'btn btn-sm',
          { [`btn-primary rounded-circle ${styles.btn}`]: isUndefined(props.className) },
          props.className
        )}
        onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
          e.preventDefault();
          e.stopPropagation();
          setCopyStatus(copyToClipboard(props.text));
        }}
      >
        <div className="d-flex flex-row align-items-center">
          <FiCopy />
          {!isUndefined(props.visibleBtnText) && props.visibleBtnText && <div className="ml-2">Copy to clipboard</div>}
        </div>
      </button>
    </div>
  );
};

export default ButtonCopyToClipboard;
