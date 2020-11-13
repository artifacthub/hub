import classnames from 'classnames';
import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { Repository } from '../../../types';
import { OCI_PREFIX } from '../../../utils/data';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ExternalLink from '../../common/ExternalLink';
import NoData from '../../common/NoData';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  repository: Repository;
  activeChannel: string;
}

interface Tab {
  name: string;
  title: string;
  shortTitle?: string;
}

const TABS: Tab[] = [
  {
    name: 'cli',
    title: 'Operator Lifecycle Manager (OCI)',
    shortTitle: 'OLM (OCI)',
  },
];
const ACTIVE_TAB: string = 'cli';

const OLMOCIInstall = (props: Props) => {
  const [activeTab, setActiveTab] = useState(ACTIVE_TAB);

  const url = props.repository.url.replace(OCI_PREFIX, '');

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
              const yaml1 = `apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: ${props.repository.name}-catalog
  namespace: default
spec:
  displayName: ${props.repository.displayName || props.repository.name}
  publisher: ${
    props.repository.userAlias || props.repository.organizationDisplayName || props.repository.organizationName
  }
  sourceType: grpc
  image: ${url}`;
              const block1 = `kubectl apply -f ${props.repository.name}-catalog.yaml`;

              const yaml2 = `apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: ${props.name}-subscription
  namespace: default
spec:
  channel: ${props.activeChannel}
  name: ${props.name}
  source: ${props.repository.name}-catalog
  sourceNamespace: default`;
              const block2 = `kubectl apply -f ${props.name}-subscription.yaml`;

              return (
                <div className="tab-pane fade show active">
                  <div className="my-2">
                    <small className="text-muted mt-2 mb-1">Install catalog</small>
                  </div>

                  <div className="mb-2">
                    <span className="badge badge-dark badge-sm">
                      <small className="text-uppercase mr-2">File:</small>
                      {props.repository.name}-catalog.yaml
                    </span>
                  </div>

                  <div className="d-flex align-items-start">
                    <div className={`flex-grow-1 mr-3 ${styles.blockWrapper}`}>
                      <SyntaxHighlighter
                        language="yaml"
                        style={docco}
                        customStyle={{
                          backgroundColor: 'var(--color-1-10)',
                        }}
                      >
                        {yaml1}
                      </SyntaxHighlighter>
                    </div>

                    <div>
                      <ButtonCopyToClipboard text={yaml1} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
                    </div>
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
                    <small className="text-muted mt-2 mb-1">Create subscription</small>
                  </div>

                  <div className="mb-2">
                    <span className="badge badge-dark badge-sm">
                      <small className="text-uppercase mr-2">File:</small>
                      {props.name}-subscription.yaml
                    </span>
                  </div>

                  <div className="d-flex align-items-start">
                    <div className={`flex-grow-1 mr-3 ${styles.blockWrapper}`}>
                      <SyntaxHighlighter
                        language="yaml"
                        style={docco}
                        customStyle={{
                          backgroundColor: 'var(--color-1-10)',
                        }}
                      >
                        {yaml2}
                      </SyntaxHighlighter>
                    </div>

                    <div>
                      <ButtonCopyToClipboard text={yaml2} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
                    </div>
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

export default OLMOCIInstall;
