import React from 'react';

import { Repository } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  repository: Repository;
}

const DEFAULT_REPO = 'https://github.com/kubernetes-sigs/krew-index';

const KrewInstall = (props: Props) => {
  const isDefaultRepo = props.repository.url.startsWith(DEFAULT_REPO);
  let installCommand = `kubectl krew install ${props.repository.name}/${props.name}`;
  if (isDefaultRepo) {
    installCommand = `kubectl krew install ${props.name}`;
  }

  return (
    <>
      {!isDefaultRepo && (
        <CommandBlock
          command={`kubectl krew index add ${props.repository.name} ${props.repository.url}`}
          title="Add repository"
        />
      )}

      <CommandBlock command={installCommand} title="Install plugin" />

      {props.repository.private && (
        <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
          <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
          <span className="font-weight-bold">private</span> and requires some credentials.
        </div>
      )}

      <div className="mt-2 d-flex flex-row justify-content-between align-items-baseline">
        <ExternalLink href="https://krew.sigs.k8s.io/docs/user-guide/setup/install/" className="btn btn-link pl-0">
          Need Krew?
        </ExternalLink>
      </div>
    </>
  );
};

export default KrewInstall;
