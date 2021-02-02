import isUndefined from 'lodash/isUndefined';
import React from 'react';

import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  activeChannel: string;
  isGlobalOperator?: boolean;
  isPrivate?: boolean;
}

const OLMInstall = (props: Props) => {
  const namespace = !isUndefined(props.isGlobalOperator) && props.isGlobalOperator ? 'operators' : `my-${props.name}`;

  return (
    <>
      <CommandBlock
        command={`kubectl create -f https://operatorhub.io/install/${props.activeChannel}/${props.name}.yaml`}
        title="Install the operator by running the following command:"
      />

      <small>
        This Operator will be installed in the "<span className="font-weight-bold">{namespace}</span>" namespace and
        will be usable from all namespaces in the cluster.
      </small>

      <CommandBlock
        command={`kubectl get csv -n ${namespace}`}
        title="After install, watch your operator come up using next command:"
      />

      <small>
        To use it, checkout the custom resource definitions (CRDs) introduced by this operator to start using it.
      </small>

      {props.isPrivate && (
        <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
          <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
          <span className="font-weight-bold">private</span> and requires some credentials.
        </div>
      )}

      <div className="mt-2">
        <ExternalLink
          href="https://github.com/operator-framework/operator-lifecycle-manager/blob/master/doc/install/install.md"
          className="btn btn-link pl-0"
        >
          Need OLM?
        </ExternalLink>
      </div>
    </>
  );
};

export default OLMInstall;
