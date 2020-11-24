import { isUndefined } from 'lodash';
import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { Repository } from '../../../types';
import { OCI_PREFIX } from '../../../utils/data';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ExternalLink from '../../common/ExternalLink';
import Tabs from '../../common/Tabs';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  version?: string;
  repository: Repository;
}

const HelmOCIInstall = (props: Props) => {
  if (isUndefined(props.version)) return null;

  const block1 = 'export HELM_EXPERIMENTAL_OCI=1';
  const url = props.repository.url.replace(OCI_PREFIX, '');
  const block2 = `helm chart pull ${url}:${props.version}`;
  const block3 = `helm chart export ${url}:${props.version}`;
  const block4 = `helm install my-${props.name} ./${props.name}`;

  return (
    <Tabs
      tabs={[
        {
          name: 'v3',
          title: 'Helm v3 (OCI)',
          content: (
            <>
              <div className="my-2">
                <small className="text-muted mt-2 mb-1">Enable OCI support</small>
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
                    {block1}
                  </SyntaxHighlighter>
                </div>

                <div>
                  <ButtonCopyToClipboard text={block1} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
                </div>
              </div>

              <div className="my-2">
                <small className="text-muted mt-2 mb-1">Pull chart from remote</small>
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
                    {block2}
                  </SyntaxHighlighter>
                </div>

                <div>
                  <ButtonCopyToClipboard text={block2} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
                </div>
              </div>

              <div className="my-2">
                <small className="text-muted mt-2 mb-1">Export chart to directory</small>
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
                    {block3}
                  </SyntaxHighlighter>
                </div>

                <div>
                  <ButtonCopyToClipboard text={block3} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
                </div>
              </div>

              <div className="my-2">
                <small className="text-muted mt-2 mb-1">Install chart</small>
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
                    {block4}
                  </SyntaxHighlighter>
                </div>

                <div>
                  <ButtonCopyToClipboard text={block4} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
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
      active="v3"
      noDataContent="Sorry, the information for installation is missing."
    />
  );
};

export default HelmOCIInstall;
