import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useState } from 'react';

import { Channel } from '../../../types';
import getOLMInstallInstructions from '../../../utils/getOLMInstallInstructions';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  name: string;
  channels?: Channel[] | null;
  defaultChannel?: string | null;
  isGlobalOperator?: boolean;
  isPrivate?: boolean;
}

const OLMInstall = (props: Props) => {
  const getActiveChannel = (): string | undefined => {
    let initialChannel: string | undefined = props.defaultChannel || undefined;
    if (isUndefined(initialChannel) && props.channels) {
      initialChannel = props.channels[0].name;
    }
    return initialChannel;
  };

  const namespace = !isUndefined(props.isGlobalOperator) && props.isGlobalOperator ? 'operators' : `my-${props.name}`;
  const [activeChannel, setActiveChannel] = useState<string | undefined>(getActiveChannel());

  if (isUndefined(props.channels) || isUndefined(activeChannel)) return null;

  const install = `cat <<EOF | kubectl apply -f -
${getOLMInstallInstructions(props.name, activeChannel, props.isGlobalOperator)}
EOF`;

  return (
    <>
      <div className="my-2">
        <small className="text-muted mt-2 mb-1">Channel</small>
      </div>

      <div className="mb-3 w-50">
        <select
          className="form-select form-select-sm"
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

      <CommandBlock command={install} language="text" title="Install the operator by running the following command:" />

      <small>
        This Operator will be installed in the "<span className="fw-bold">{namespace}</span>" namespace and will be
        usable from all namespaces in the cluster.
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

export default OLMInstall;
