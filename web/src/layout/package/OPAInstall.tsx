import classnames from 'classnames';
import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import NoData from '../common/NoData';
import styles from './ContentInstall.module.css';

interface Props {
  install?: string | null;
}

interface Tab {
  name: string;
  title: string;
}

const TABS: Tab[] = [
  {
    name: 'cli',
    title: 'OPA policies',
  },
];
const ACTIVE_TAB: string = 'cli';

const OPAInstall = (props: Props) => {
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
              return (
                <div className="tab-pane fade show active">
                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <small className="text-muted mt-2 mb-1">Install repository</small>
                  </div>

                  <SyntaxHighlighter
                    language="bash"
                    style={docco}
                    customStyle={{
                      backgroundColor: 'var(--color-1-10)',
                    }}
                  >
                    {props.install}
                  </SyntaxHighlighter>
                </div>
              );
            default:
              return (
                <div className="tab-pane fade show active">
                  <NoData>Sorry, the information for Install is missing.</NoData>
                </div>
              );
          }
        })()}
      </div>
    </>
  );
};

export default OPAInstall;
