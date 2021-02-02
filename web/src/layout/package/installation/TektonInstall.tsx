import React from 'react';

import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  contentUrl: string;
  isPrivate?: boolean;
}

const TektonInstall = (props: Props) => (
  <div className="mt-3">
    <CommandBlock command={`kubectl apply -f ${props.contentUrl}`} title="Install the task:" />

    {props.isPrivate && (
      <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
        <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
        <span className="font-weight-bold">private</span> and requires some credentials.
      </div>
    )}
  </div>
);

export default TektonInstall;
