import { useEffect, useState } from 'react';

import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import CodeViewer from '../../common/CodeViewer';
import styles from './ContentInstall.module.css';

interface Props {
  command: string;
  language?: string;
  title?: string;
  filename?: string;
  btnClassname?: string;
  withoutCopyBtn?: boolean;
}

const CommandBlock = (props: Props) => {
  const [visibleCommand, setVisibleCommand] = useState(props.command);

  useEffect(() => {
    setVisibleCommand(' ');
    const timeout = setTimeout(() => {
      setVisibleCommand(props.command);
    }, 10);

    return () => {
      clearTimeout(timeout);
    };
  }, [props.command]);

  return (
    <>
      {props.title && (
        <div className="my-2">
          <small className="text-muted mt-2 mb-1">{props.title}</small>
        </div>
      )}

      {props.filename && (
        <div className="mb-2">
          <span className="badge badge-dark badge-sm">
            <small className="text-uppercase me-2">File:</small>
            {props.filename}
          </span>
        </div>
      )}

      <div className="d-flex align-items-start">
        <div className={`flex-grow-1 ${styles.blockWrapper}`}>
          <CodeViewer
            content={visibleCommand}
            language={props.language || 'bash'}
            customStyle={{
              backgroundColor: 'var(--color-1-10)',
            }}
          />
        </div>

        {!props.withoutCopyBtn && (
          <div className="ms-3">
            <ButtonCopyToClipboard
              text={props.command}
              className={`btn-primary ${styles.copyBtn} ${props.btnClassname}`}
              label="Copy command to clipboard"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default CommandBlock;
