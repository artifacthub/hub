import React from 'react';

import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';

interface Props {
  normalizedName: string;
}

const FalcoInstall = (props: Props) => (
  <div className="mt-3">
    <CommandBlock
      command={`helm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/${props.normalizedName}/custom-rules.yaml stable/falco`}
    />

    <div className="mt-2">
      <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link pl-0">
        Need Helm?
      </ExternalLink>
    </div>
  </div>
);

export default FalcoInstall;
