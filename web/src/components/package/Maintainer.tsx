import React from 'react';
import { GiEnvelope } from 'react-icons/gi';
import { MaintainerInfo } from '../../types';
import ExternalLink from '../common/ExternalLink';

const Maintainer = (props: MaintainerInfo) => (
  <div className="mb-1">
    <ExternalLink href={`mailto:${props.email}`} className="text-primary">
      <div className="d-flex align-items-center">
        <GiEnvelope className="text-muted mr-2 h6 mb-0" />
        <>{props.name || props.email}</>
      </div>
    </ExternalLink>
  </div>
);

export default Maintainer;
