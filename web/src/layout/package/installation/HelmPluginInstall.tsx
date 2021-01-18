import React from 'react';

import { Repository } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';

interface Props {
  repository: Repository;
}

const HelmPluginInstall = (props: Props) => {
  return (
    <>
      <CommandBlock command={`helm plugin install ${props.repository.url}`} title="Install plugin" />

      <div className="mt-2 d-flex flex-row justify-content-between align-items-baseline">
        <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link pl-0">
          Need Helm?
        </ExternalLink>
      </div>
    </>
  );
};

export default React.memo(HelmPluginInstall);
