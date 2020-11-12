import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ExternalLink from '../../common/ExternalLink';
import NoData from '../../common/NoData';
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
              const block1 = `kubectl create -f https://operatorhub.io/install/${props.activeChannel}/${props.name}.yaml`;
              const block2 = `kubectl get csv -n ${namespace}`;

              return (
                <div className="tab-pane fade show active">
                  <div className="my-2">
                    <small className="text-muted mt-2 mb-1">
                      Install the operator by running the following command:
                    </small>
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

                  <small>
                    This Operator will be installed in the "<span className="font-weight-bold">{namespace}</span>"
                    namespace and will be usable from all namespaces in the cluster.
                  </small>

                  <div className="my-2">
                    <small className="text-muted mt-2 mb-1">
                      After install, watch your operator come up using next command:
                    </small>
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

                  <small>
                    To use it, checkout the custom resource definitions (CRDs) introduced by this operator to start
                    using it.
                  </small>

                  <div className="mt-2">
                    <ExternalLink
                      href="https://github.com/operator-framework/operator-lifecycle-manager/blob/master/doc/install/install.md"
                      className="btn btn-link pl-0"
                    >
                      Need OLM?
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

export default OLMInstall;
