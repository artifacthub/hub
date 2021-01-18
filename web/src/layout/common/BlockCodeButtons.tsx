import React from 'react';
import { BiCloudDownload } from 'react-icons/bi';

import styles from './BlockCodeButtons.module.css';
import ButtonCopyToClipboard from './ButtonCopyToClipboard';

interface Props {
  filename: string;
  content: string;
  className?: string;
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

  return (
    <div className={`position-absolute d-flex flex-row ${styles.wrapper} ${props.className}`}>
      <ButtonCopyToClipboard text={props.content} />

      <button
        data-testid="downloadBtn"
        className={`btn btn-sm btn-primary rounded-circle ml-2 ${styles.btn}`}
        onClick={downloadFile}
      >
        <BiCloudDownload />
      </button>
    </div>
  );
};

export default React.memo(BlockCodeButtons);
