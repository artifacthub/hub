import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import Tabs from '../../common/Tabs';
import styles from './ContentInstall.module.css';

interface Props {
  install?: string | null;
}

const OPAInstall = (props: Props) => {
  return (
    <Tabs
      tabs={[
        {
          name: 'cli',
          title: 'OPA policies',
          content: (
            <>
              <div className="my-2">
                <small className="text-muted mt-2 mb-1">Install repository</small>
              </div>

              <div className="d-flex align-items-start">
                <div className={`flex-grow-1 mr-3 ${styles.blockWrapper}`}>
                  <SyntaxHighlighter
                    language="bash"
                    style={docco}
                    customStyle={{
                      backgroundColor: 'var(--color-1-10)',
                    }}
                  >
                    {props.install || 'Any install instructions have been provided'}
                  </SyntaxHighlighter>
                </div>

                {props.install && (
                  <div>
                    <ButtonCopyToClipboard
                      text={props.install}
                      className={`btn-primary rounded-circle ${styles.copyBtn}`}
                    />
                  </div>
                )}
              </div>
            </>
          ),
        },
      ]}
      active="cli"
      noDataContent="Sorry, the information for installation is missing."
    />
  );
};

export default OPAInstall;
