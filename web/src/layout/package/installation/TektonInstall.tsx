import React from 'react';

import { Repository, RepositoryKind } from '../../../types';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  contentUrl: string;
  isPrivate?: boolean;
  repository: Repository;
}

const TektonInstall = (props: Props) => (
  <div className="mt-3">
    <CommandBlock
      command={`kubectl apply -f ${props.contentUrl}`}
      title={`Install the ${props.repository.kind === RepositoryKind.TektonPipeline ? 'pipeline' : 'task'}:`}
    />

    {props.isPrivate && (
      <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
        <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
        <span className="font-weight-bold">private</span> and requires some credentials.
      </div>
    )}
  </div>
);

export default TektonInstall;
