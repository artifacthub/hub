import { isUndefined } from 'lodash';
import React from 'react';
import { BiCloudDownload } from 'react-icons/bi';

import styles from './BlockCodeButtons.module.css';
import ButtonCopyToClipboard from './ButtonCopyToClipboard';

interface Props {
  filename: string;
  content: string;
  className?: string;
  boxShadowColor?: string;
  hiddenCopyBtn?: boolean;
}

const BlockCodeButtons = (props: Props) => {
  const downloadFile = () => {
    const blob = new Blob([props.content], {
      type: 'text/yaml',
    });

    const link: HTMLAnchorElement = document.createElement('a');
    link.download = props.filename;
    link.href = window.URL.createObjectURL(blob);
    link.style.display = 'none';
    document.body.appendChild(link);

    link.click();
  };

  const btnStyle: undefined | { [key: string]: string } = !isUndefined(props.boxShadowColor)
    ? {
        boxShadow: `0px 0px 0px 8px ${props.boxShadowColor}`,
      }
    : {};

  return (
    <div className={`position-absolute d-flex flex-row ${styles.wrapper} ${props.className}`}>
      {(isUndefined(props.hiddenCopyBtn) || !props.hiddenCopyBtn) && (
        <ButtonCopyToClipboard wrapperClassName="mr-2" text={props.content} style={btnStyle} />
      )}

      <button
        data-testid="downloadBtn"
        className={`btn btn-sm btn-primary rounded-circle ${styles.btn}`}
        style={btnStyle}
        onClick={downloadFile}
      >
        <BiCloudDownload />
      </button>
    </div>
  );
};

export default BlockCodeButtons;
