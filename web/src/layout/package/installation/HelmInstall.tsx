import React from 'react';

import { Repository } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  version?: string;
  repository: Repository;
  contentUrl?: string;
  label?: string;
}

const HelmInstall = (props: Props) => {
  const getInstallationVersionInfo = (installCmd: string) => {
    return (
      <>
        <CommandBlock
          command={`helm repo add ${props.repository.name} ${props.repository.url}`}
          title="Add repository"
        />

        {props.repository.private && (
          <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
            <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
            <span className="font-weight-bold">private</span> and requires some credentials.
          </div>
        )}

        <CommandBlock command={installCmd} title="Install chart" />

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
    <>
      {(() => {
        switch (props.label) {
          case 'v3':
            return (
              <>
                {getInstallationVersionInfo(
                  `helm install my-${props.name} ${props.repository.name}/${props.name} --version ${props.version}`
                )}
              </>
            );
          case 'v2':
            return (
              <>
                {getInstallationVersionInfo(
                  `helm install --name my-${props.name} ${props.repository.name}/${props.name} --version ${props.version}`
                )}
              </>
            );
        }
      })()}
    </>
  );
};

export default HelmInstall;
