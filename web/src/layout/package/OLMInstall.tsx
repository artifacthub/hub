import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import NoData from '../common/NoData';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  activeChannel: string;
  isGlobalOperator?: boolean;
}

interface Tab {
  name: string;
  title: string;
  shortTitle?: string;
}

const TABS: Tab[] = [
  {
    name: 'cli',
    title: 'Operator Lifecycle Manager',
    shortTitle: 'OLM CLI',
  },
];
const ACTIVE_TAB: string = 'cli';

const OLMInstall = (props: Props) => {
  const [activeTab, setActiveTab] = useState(ACTIVE_TAB);

  const namespace = !isUndefined(props.isGlobalOperator) && props.isGlobalOperator ? 'operators' : `my-${props.name}`;

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
                <span className="d-none d-sm-block">{tab.title}</span>
                <span className="d-block d-sm-none">{tab.shortTitle || tab.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="tab-content mt-3">
        {(() => {
          switch (activeTab) {
            case 'cli':
              const preBlock =
                'curl -sL https://github.com/operator-framework/operator-lifecycle-manager/releases/download/0.15.1/install.sh | bash -s 0.15.1';
              const block1 = `kubectl create -f https://operatorhub.io/install/${props.activeChannel}/${props.name}.yaml`;
              const block2 = `kubectl get csv -n ${namespace}`;

              return (
                <div className="tab-pane fade show active">
                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <small className="text-muted mt-2 mb-1">
                      Install Operator Lifecycle Manager (OLM), a tool to help manage the Operators running on your
                      cluster.
                    </small>
                    <div>
                      <ButtonCopyToClipboard text={preBlock} />
                    </div>
                  </div>

                  <SyntaxHighlighter
                    language="bash"
                    style={docco}
                    customStyle={{
                      backgroundColor: 'var(--color-1-10)',
                    }}
                  >
                    {preBlock}
                  </SyntaxHighlighter>

                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <small className="text-muted mt-2 mb-1">
                      Install the operator by running the following command:
                    </small>
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

                  <small>
                    This Operator will be installed in the "<span className="font-weight-bold">{namespace}</span>"
                    namespace and will be usable from all namespaces in the cluster.
                  </small>

                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <small className="text-muted mt-2 mb-1">
                      After install, watch your operator come up using next command:
                    </small>
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

                  <small>
                    To use it, checkout the custom resource definitions (CRDs) introduced by this operator to start
                    using it.
                  </small>
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

export default OLMInstall;
