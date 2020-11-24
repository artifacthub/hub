import isUndefined from 'lodash/isUndefined';
import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { Repository } from '../../../types';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ExternalLink from '../../common/ExternalLink';
import Tabs from '../../common/Tabs';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  version?: string;
  repository: Repository;
  contentUrl?: string | null;
}

const HelmInstall = (props: Props) => {
  if (isUndefined(props.version)) return null;

  const getInstallationVersionInfo = (block2: string) => {
    const block1 = `helm repo add ${props.repository.name} ${props.repository.url}`;
    return (
      <>
        <div className="my-2">
          <small className="text-muted mt-2 mb-1">Add repository</small>
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

        {props.repository.private && (
          <div className={`alert alert-warning my-4 ${styles.alert}`}>
            <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
            <span className="font-weight-bold">private</span> and requires some credentials.
          </div>
        )}

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
              {block2}
            </SyntaxHighlighter>
          </div>

          <div>
            <ButtonCopyToClipboard text={block2} className={`btn-primary rounded-circle ${styles.copyBtn}`} />
          </div>
        </div>

        <div className={`font-italic text-muted ${styles.legend}`}>
          <span className="font-weight-bold">my-{props.name}</span> corresponds to the release name, feel free to change
          it to suit your needs. You can also add additional flags to the{' '}
          <span className="font-weight-bold">helm install</span> command if you need to.
        </div>

        <div className="mt-2 d-flex flex-row justify-content-between align-items-baseline">
          <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link pl-0">
            Need Helm?
          </ExternalLink>

          {props.contentUrl && (
            <div className="d-none d-lg-block">
              <small className="text-muted pl-2">
                You can also download this package's content directly using{' '}
                <ExternalLink href={props.contentUrl} className="text-reset" target="_self">
                  <u>this link</u>
                </ExternalLink>
                .
              </small>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Tabs
      tabs={[
        {
          name: 'v3',
          title: 'Helm v3',
          content: (
            <>
              {getInstallationVersionInfo(
                `helm install my-${props.name} ${props.repository.name}/${props.name} --version ${props.version}`
              )}
            </>
          ),
        },
        {
          name: 'v2',
          title: 'Helm v2',
          content: (
            <>
              {getInstallationVersionInfo(
                `helm install --name my-${props.name} ${props.repository.name}/${props.name} --version ${props.version}`
              )}
            </>
          ),
        },
      ]}
      active="v3"
      noDataContent="Sorry, the information for installation is missing."
    />
  );
};

export default HelmInstall;
