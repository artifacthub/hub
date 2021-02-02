import React from 'react';

import { Repository } from '../../../types';
import { OCI_PREFIX } from '../../../utils/data';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  version?: string;
  repository: Repository;
}

const HelmOCIInstall = (props: Props) => {
  const url = props.repository.url.replace(OCI_PREFIX, '');

  return (
    <>
      <CommandBlock command="export HELM_EXPERIMENTAL_OCI=1" title="Enable OCI support" />

      <CommandBlock command={`helm chart pull ${url}:${props.version}`} title="Pull chart from remote" />

      <CommandBlock command={`helm chart export ${url}:${props.version}`} title="Export chart to directory" />

      <CommandBlock command={`helm install my-${props.name} ./${props.name}`} title="Install chart" />

      {props.repository.private && (
        <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
          <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
          <span className="font-weight-bold">private</span> and requires some credentials.
        </div>
      )}

      <div className="mt-2">
        <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link pl-0">
          Need Helm?
        </ExternalLink>
      </div>
    </>
  );
};

export default HelmOCIInstall;
