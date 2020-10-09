import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { Channel, Package } from '../../types';
import ExpandableList from '../common/ExpandableList';
import RSSLinkTitle from '../common/RSSLinkTitle';
import SmallTitle from '../common/SmallTitle';
import CapabilityLevel from './CapabilityLevel';
import ContainersImages from './ContainersImages';
import Keywords from './Keywords';
import License from './License';
import Links from './Links';
import Maintainers from './Maintainers';
import styles from './OLMOperatorsDetails.module.css';
import SecurityReport from './securityReport';

interface Props {
  package: Package;
  allVersions: JSX.Element[];
  activeChannel?: string | null;
  onChannelChange: (channel: string) => void;
}

const OLMOperatorsDetails = (props: Props) => (
  <>
    <div>
      <SmallTitle text="Channel" />
      <select
        className={`custom-select custom-select-sm bg-light mb-3 ${styles.select}`}
        aria-label="channel-select"
        value={props.activeChannel!}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => props.onChannelChange(e.target.value)}
      >
        {props.package.channels!.map((channel: Channel) => (
          <option key={`channel_${channel.name}`} value={channel.name}>
            {channel.name}
          </option>
        ))}
      </select>
    </div>

    <div>
      <RSSLinkTitle title="Versions" package={props.package} />
      {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
        <p data-testid="versions">-</p>
      ) : (
        <div className="mb-3" data-testid="versions">
          <ExpandableList items={props.allVersions} visibleItems={3} />
        </div>
      )}
    </div>

    <SecurityReport
      summary={props.package.securityReportSummary}
      packageId={props.package.packageId}
      version={props.package.version!}
    />

    <CapabilityLevel capabilityLevel={props.package.capabilities} />

    {props.package.provider && (
      <>
        <div>
          <SmallTitle text="Provider" />
          <p className="text-truncate">{props.package.provider}</p>
        </div>
      </>
    )}

    <Links links={props.package.links} />

    <Maintainers maintainers={props.package.maintainers} />

    {props.package.license && (
      <>
        <SmallTitle text="License" />
        <License
          license={props.package.license}
          className="mb-3"
          linkClassName="text-primary py-1 py-sm-0"
          visibleIcon
        />
      </>
    )}

    <ContainersImages containers={props.package.containersImages} />

    <SmallTitle text="Keywords" />
    <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
  </>
);

export default OLMOperatorsDetails;
