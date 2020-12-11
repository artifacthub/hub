import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import styles from './ContentInstall.module.css';

interface Props {
  command: string;
  language?: string;
  title?: string;
  filename?: string;
}

const CommandBlock = (props: Props) => (
  <>
    {props.title && (
      <div className="my-2">
        <small className="text-muted mt-2 mb-1">{props.title}</small>
      </div>
    )}

    {props.filename && (
      <div className="mb-2">
        <span className="badge badge-dark badge-sm">
          <small className="text-uppercase mr-2">File:</small>
          {props.filename}
        </span>
      </div>
    )}

    <div className="d-flex align-items-start">
      <div className={`flex-grow-1 mr-3 ${styles.blockWrapper}`}>
        <SyntaxHighlighter
          language={props.language || 'bash'}
          style={docco}
          customStyle={{
            backgroundColor: 'var(--color-1-10)',
          }}
        >
          {props.command}
        </SyntaxHighlighter>
      </div>

      <div>
        <ButtonCopyToClipboard text={props.command} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
      </div>
    </div>
  </>
);

export default CommandBlock;
