import classnames from 'classnames';
import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ExternalLink from '../../common/ExternalLink';
import NoData from '../../common/NoData';
import styles from './ContentInstall.module.css';

interface Props {
  normalizedName: string;
}

interface Tab {
  name: string;
  title: string;
}

const TABS: Tab[] = [
  {
    name: 'cli',
    title: 'Helm CLI',
  },
];
const ACTIVE_TAB: string = 'cli';

const FalcoInstall = (props: Props) => {
  const [activeTab, setActiveTab] = useState(ACTIVE_TAB);

  return (
    <>
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

      <div className="tab-content mt-3">
        {(() => {
          switch (activeTab) {
            case 'cli':
              const block1 = `helm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/${props.normalizedName}/custom-rules.yaml stable/falco`;

              return (
                <div className="tab-pane fade show active">
                  <div className="d-flex align-items-center justify-content-end mt-2 mb-2">
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

export default FalcoInstall;
