import React from 'react';

import { Repository } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  repository: Repository;
}

const HelmPluginInstall = (props: Props) => {
  return (
    <>
      <CommandBlock command={`helm plugin install ${props.repository.url}`} title="Install plugin" />

      {props.repository.private && (
        <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
          <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
          <span className="font-weight-bold">private</span> and requires some credentials.
        </div>
      )}

      <div className="mt-2 d-flex flex-row justify-content-between align-items-baseline">
        <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link pl-0">
          Need Helm?
        </ExternalLink>
      </div>
    </>
  );
};

export default HelmPluginInstall;
