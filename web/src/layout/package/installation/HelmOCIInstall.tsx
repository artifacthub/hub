import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { Repository } from '../../../types';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ExternalLink from '../../common/ExternalLink';
import NoData from '../../common/NoData';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  version?: string;
  repository: Repository;
}

interface Tab {
  name: string;
  title: string;
}

const TABS: Tab[] = [
  {
    name: 'v3',
    title: 'Helm v3 (OCI)',
  },
];
const ACTIVE_TAB: string = 'v3';

const HelmOCIInstall = (props: Props) => {
  const [activeTab, setActiveTab] = useState(ACTIVE_TAB);

  if (isUndefined(props.version)) return null;

  return (
    <>
      <div>
        <ul className={`nav nav-tabs ${styles.tabs}`}>
          {TABS.map((tab: Tab) => (
            <li className="nav-item" key={tab.name}>
              <button
                className={classnames('btn btn-link nav-item', styles.btn, {
                  [`active btn-primary ${styles.active}`]: tab.name === activeTab,
                })}
                onClick={() => setActiveTab(tab.name)}
              >
                {tab.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="tab-content mt-3">
        {(() => {
          switch (activeTab) {
            case 'v3':
              const block1 = 'export HELM_EXPERIMENTAL_OCI=1';
              const url = props.repository.url.replace('oci://', '');
              const block2 = `helm chart pull ${url}:${props.version}`;
              const block3 = `helm chart export ${url}:${props.version}`;
              const block4 = `helm install my-${props.name} ./${props.name}`;

              return (
                <div className="tab-pane fade show active">
                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <small className="text-muted mt-2 mb-1">Enable OCI support</small>
                    <div>
                      <ButtonCopyToClipboard text={block1} />
                    </div>
                  </div>

                  <SyntaxHighlighter
                    language="bash"
                    style={docco}
                    customStyle={{
                      backgroundColor: 'var(--color-1-10)',
                    }}
                  >
                    {block1}
                  </SyntaxHighlighter>

                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <small className="text-muted mt-2 mb-1">Pull chart from remote</small>
                    <div>
                      <ButtonCopyToClipboard text={block2} />
                    </div>
                  </div>

                  <SyntaxHighlighter
                    language="bash"
                    style={docco}
                    customStyle={{
                      backgroundColor: 'var(--color-1-10)',
                    }}
                  >
                    {block2}
                  </SyntaxHighlighter>

                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <small className="text-muted mt-2 mb-1">Export chart to directory</small>
                    <div>
                      <ButtonCopyToClipboard text={block3} />
                    </div>
                  </div>

                  <SyntaxHighlighter
                    language="bash"
                    style={docco}
                    customStyle={{
                      backgroundColor: 'var(--color-1-10)',
                    }}
                  >
                    {block3}
                  </SyntaxHighlighter>

                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <small className="text-muted mt-2 mb-1">Install chart</small>
                    <div>
                      <ButtonCopyToClipboard text={block4} />
                    </div>
                  </div>

                  <SyntaxHighlighter
                    language="bash"
                    style={docco}
                    customStyle={{
                      backgroundColor: 'var(--color-1-10)',
                    }}
                  >
                    {block4}
                  </SyntaxHighlighter>

                  <div className="mt-2">
                    <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link pl-0">
                      Need Helm?
                    </ExternalLink>
                  </div>
                </div>
              );
            default:
              return (
                <div className="tab-pane fade show active">
                  <NoData>Sorry, the information for installation is missing.</NoData>
                </div>
              );
          }
        })()}
      </div>
    </>
  );
};

export default HelmOCIInstall;
