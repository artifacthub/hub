import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useState } from 'react';

import { Channel, Repository } from '../../../types';
import { OCI_PREFIX } from '../../../utils/data';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  repository: Repository;
  channels?: Channel[] | null;
  defaultChannel?: string | null;
}

const OLMOCIInstall = (props: Props) => {
  const getActiveChannel = (): string | undefined => {
    let initialChannel: string | undefined = props.defaultChannel || undefined;
    if (isUndefined(initialChannel) && props.channels) {
      initialChannel = props.channels[0].name;
    }
    return initialChannel;
  };

  const [activeChannel, setActiveChannel] = useState<string | undefined>(getActiveChannel());

  if (isUndefined(props.channels)) return null;

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
  channel: ${activeChannel}
  name: ${props.name}
  source: ${props.repository.name}-catalog
  sourceNamespace: default`;

  return (
    <>
      <div className="my-2">
        <small className="text-muted mt-2 mb-1">Channel</small>
      </div>

      <div className=" w-50">
        <select
          className="form-select form-select-sm mb-1"
          aria-label="channel-select"
          value={activeChannel}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setActiveChannel(e.target.value)}
        >
          {props.channels!.map((channel: Channel) => (
            <option key={`channel_${channel.name}`} value={channel.name}>
              {channel.name}
            </option>
          ))}
        </select>
      </div>

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

      {props.repository.private && (
        <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
          <span className="fw-bold text-uppercase">Important:</span> This repository is{' '}
          <span className="fw-bold">private</span> and requires some credentials.
        </div>
      )}

      <div className="mt-2">
        <ExternalLink
          href="https://github.com/operator-framework/operator-lifecycle-manager/blob/master/doc/install/install.md"
          className="btn btn-link ps-0"
          label="Download OLM"
        >
          Need OLM?
        </ExternalLink>
      </div>
    </>
  );
};

export default OLMOCIInstall;
