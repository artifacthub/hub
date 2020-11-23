import { isNull } from 'lodash';
import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { Channel, Package, RepositoryKind, SearchFiltersURL, Version as VersionData } from '../../types';
import ExpandableList from '../common/ExpandableList';
import RSSLinkTitle from '../common/RSSLinkTitle';
import SmallTitle from '../common/SmallTitle';
import CapabilityLevel from './CapabilityLevel';
import ContainersImages from './ContainersImages';
import Dependencies from './Dependencies';
import styles from './Details.module.css';
import Keywords from './Keywords';
import License from './License';
import Links from './Links';
import Maintainers from './Maintainers';
import SecurityReport from './securityReport';
import Version from './Version';

interface Props {
  package: Package;
  activeChannel?: string | null;
  onChannelChange: (channel: string) => void;
  sortedVersions: VersionData[];
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  visibleSecurityReport: boolean;
}

const Details = (props: Props) => {
  const allVersions: JSX.Element[] = props.sortedVersions.map((av_version: VersionData) => (
    <Version
      key={av_version.version}
      isActive={av_version.version === props.package.version}
      {...av_version}
      packageItem={{
        ...props.package,
        version: av_version.version,
      }}
      searchUrlReferer={props.searchUrlReferer}
      fromStarredPage={props.fromStarredPage}
    />
  ));

  const versionsTitle = props.package.repository.kind === RepositoryKind.Helm ? 'Chart versions' : 'Versions';

  return (
    <>
      {(() => {
        switch (props.package.repository.kind) {
          case RepositoryKind.Helm:
            return (
              <>
                {props.package.appVersion && (
                  <div>
                    <SmallTitle text="Application version" />
                    <p data-testid="appVersion" className="text-truncate">
                      {props.package.appVersion}
                    </p>
                  </div>
                )}
              </>
            );
          case RepositoryKind.OLM:
            return (
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
            );
          default:
            return null;
        }
      })()}

      <div>
        <RSSLinkTitle title={versionsTitle} package={props.package} />
        {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
          <p data-testid="versions">-</p>
        ) : (
          <div className="mb-3" data-testid="versions">
            <ExpandableList items={allVersions} visibleItems={3} />
          </div>
        )}
      </div>

      <SecurityReport
        summary={props.package.securityReportSummary}
        packageId={props.package.packageId}
        version={props.package.version!}
        createdAt={props.package.securityReportCreatedAt}
        visibleSecurityReport={props.visibleSecurityReport}
        searchUrlReferer={props.searchUrlReferer}
        fromStarredPage={props.fromStarredPage}
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

      <Links links={props.package.links} homeUrl={props.package.homeUrl} />

      <Maintainers maintainers={props.package.maintainers} />

      {props.package.license && (
        <>
          <SmallTitle text="License" />
          <License
            license={props.package.license}
            className="mb-3"
            linkClassName="text-primary py-1 py-sm-0"
            linkContentClassName={styles.text}
            visibleIcon
          />
        </>
      )}

      <ContainersImages containers={props.package.containersImages} />

      {props.package.repository.kind === RepositoryKind.Helm &&
        !isUndefined(props.package.data) &&
        !isNull(props.package.data) && <Dependencies dependencies={props.package.data.dependencies} />}

      <SmallTitle text="Keywords" />
      <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
    </>
  );
};

export default Details;
