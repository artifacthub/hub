import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ExternalLink from '../../common/ExternalLink';
import Tabs from '../../common/Tabs';
import styles from './ContentInstall.module.css';

interface Props {
  normalizedName: string;
}

const FalcoInstall = (props: Props) => {
  const block1 = `helm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/${props.normalizedName}/custom-rules.yaml stable/falco`;

  return (
    <Tabs
      tabs={[
        {
          name: 'cli',
          title: 'Helm CLI',
          content: (
            <>
              <div className="d-flex align-items-start my-2 pt-2">
                <div className={`flex-grow-1 mr-3 ${styles.blockWrapper}`}>
                  <SyntaxHighlighter
                    language="bash"
                    style={docco}
                    customStyle={{
                      backgroundColor: 'var(--color-1-10)',
                    }}
                  >
                    {block1}
                  </SyntaxHighlighter>
                </div>

                <div>
                  <ButtonCopyToClipboard text={block1} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
                </div>
              </div>

              <div className="mt-2">
                <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link pl-0">
                  Need Helm?
                </ExternalLink>
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

export default FalcoInstall;
