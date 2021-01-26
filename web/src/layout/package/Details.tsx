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
  const allVersions: JSX.Element[] = props.sortedVersions.map((av_version: VersionData, index: number) => (
    <Version
      key={`${av_version.version}_${index}`}
      isActive={av_version.version === props.package.version}
      {...av_version}
      normalizedName={props.package.normalizedName}
      repository={props.package.repository}
      searchUrlReferer={props.searchUrlReferer}
      fromStarredPage={props.fromStarredPage}
    />
  ));

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
        <RSSLinkTitle
          title={props.package.repository.kind === RepositoryKind.Helm ? 'Chart versions' : 'Versions'}
          normalizedName={props.package.normalizedName}
          repository={props.package.repository}
          version={props.package.version!}
        />
        {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
          <p data-testid="versions">-</p>
        ) : (
          <div className="mb-3" data-testid="versions">
            <ExpandableList items={allVersions} visibleItems={3} resetStatusOnChange={props.package.packageId} />
          </div>
        )}
      </div>

      {props.package.repository.kind === RepositoryKind.TektonTask &&
        props.package.data &&
        props.package.data.pipelinesMinVersion && (
          <div>
            <SmallTitle text="Pipeline minimal version" />
            <p data-testid="appVersion" className="text-truncate">
              {props.package.data.pipelinesMinVersion}
            </p>
          </div>
        )}

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

      <ContainersImages containers={props.package.containersImages} packageId={props.package.packageId} />

      {props.package.repository.kind === RepositoryKind.Helm &&
        !isUndefined(props.package.data) &&
        !isNull(props.package.data) && (
          <Dependencies dependencies={props.package.data.dependencies} packageId={props.package.packageId} />
        )}

      <SmallTitle text="Keywords" />
      <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
    </>
  );
};

export default Details;
