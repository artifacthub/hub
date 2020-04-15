import React, { useState } from 'react';
import { FiCopy } from 'react-icons/fi';

import styles from './ButtonCopyToClipboard.module.css';

interface Props {
  text: string;
}

const copyToClipboard = (text: string): boolean => {
  try {
    const textField = document.createElement('textarea');
    textField.innerText = text;
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
    <div className="position-relative">
      {copyStatus && (
        <div className={`tooltip bs-tooltip-bottom show ${styles.tooltip}`} role="tooltip">
          <div className={`arrow ${styles.tooltipArrow}`} />
          <div className={`tooltip-inner ${styles.tooltipContent}`}>Copied!</div>
        </div>
      )}

      <button
        data-testid="ctcBtn"
        type="button"
        className="btn btn-primary btn-sm rounded-circle"
        onClick={() => setCopyStatus(copyToClipboard(props.text))}
      >
        <FiCopy />
      </button>
    </div>
  );
};

export default ButtonCopyToClipboard;
