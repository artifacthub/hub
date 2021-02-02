import React from 'react';

import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  normalizedName: string;
  isPrivate?: boolean;
}

const FalcoInstall = (props: Props) => (
  <div className="mt-3">
    <CommandBlock
      command={`helm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/${props.normalizedName}/custom-rules.yaml stable/falco`}
    />

    {props.isPrivate && (
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
  </div>
);

export default FalcoInstall;
