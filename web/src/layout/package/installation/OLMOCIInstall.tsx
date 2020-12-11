import React from 'react';

import { Repository } from '../../../types';
import { OCI_PREFIX } from '../../../utils/data';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';

interface Props {
  name: string;
  repository: Repository;
  activeChannel: string;
}

const OLMOCIInstall = (props: Props) => {
  const url = props.repository.url.replace(OCI_PREFIX, '');
  const catalog = `apiVersion: operators.coreos.com/v1alpha1
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

  const subscription = `apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: ${props.name}-subscription
  namespace: default
spec:
  channel: ${props.activeChannel}
  name: ${props.name}
  source: ${props.repository.name}-catalog
  sourceNamespace: default`;

  return (
    <>
      <CommandBlock
        command={catalog}
        title="Install catalog"
        language="yaml"
        filename={`${props.repository.name}-catalog.yaml`}
      />

      <CommandBlock command={`kubectl apply -f ${props.repository.name}-catalog.yaml`} />

      <CommandBlock
        command={subscription}
        title="Create subscription"
        language="yaml"
        filename={`${props.name}-subscription.yaml`}
      />

      <CommandBlock command={`kubectl apply -f ${props.name}-subscription.yaml`} />

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

export default OLMOCIInstall;
