import { isNull } from 'lodash';
import isUndefined from 'lodash/isUndefined';
import React, { useCallback, useEffect, useState } from 'react';

import { Channel, HelmChartType, Package, RepositoryKind, SearchFiltersURL, Version as VersionData } from '../../types';
import RSSLinkTitle from '../common/RSSLinkTitle';
import SeeAllModal from '../common/SeeAllModal';
import SmallTitle from '../common/SmallTitle';
import CapabilityLevel from './CapabilityLevel';
import ContainersImages from './ContainersImages';
import Dependencies from './Dependencies';
import styles from './Details.module.css';
import Keywords from './Keywords';
import License from './License';
import Links from './Links';
import Maintainers from './Maintainers';
import Platforms from './Platforms';
import SecurityReport from './securityReport';
import Version from './Version';
import VersionInRow from './VersionInRow';

interface Props {
  package: Package;
  activeChannel?: string | null;
  onChannelChange: (channel: string) => void;
  sortedVersions: VersionData[];
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  visibleSecurityReport: boolean;
}

interface VersionsProps {
  items: JSX.Element[];
  itemsForModal: JSX.Element[] | JSX.Element;
}

const Details = (props: Props) => {
  const getAllVersions = useCallback((): VersionsProps => {
    let items: JSX.Element[] = [];
    let itemsForModal: JSX.Element[] = [];

    props.sortedVersions.forEach((av_version: VersionData, index: number) => {
      items.push(
        <Version
          key={`${av_version.version}_${index}`}
          isActive={av_version.version === props.package.version}
          {...av_version}
          normalizedName={props.package.normalizedName}
          repository={props.package.repository}
          searchUrlReferer={props.searchUrlReferer}
          fromStarredPage={props.fromStarredPage}
        />
      );

      itemsForModal.push(
        <VersionInRow
          key={`${av_version.version}_inline_${index}`}
          isActive={av_version.version === props.package.version}
          {...av_version}
          normalizedName={props.package.normalizedName}
          repository={props.package.repository}
          searchUrlReferer={props.searchUrlReferer}
          fromStarredPage={props.fromStarredPage}
        />
      );
    });

    return {
      items,
      itemsForModal: (
        <table className={`table table-striped table-bordered table-sm mb-0 ${styles.table}`}>
          <thead>
            <tr className={`table-primary ${styles.tableTitle}`}>
              <th scope="col">
                <span className="px-1">Version</span>
              </th>
              <th scope="col" className={styles.releasedCell}>
                <span className="px-1">Released</span>
              </th>
            </tr>
          </thead>
          <tbody>{itemsForModal}</tbody>
        </table>
      ),
    };
  }, [
    props.fromStarredPage,
    props.package.normalizedName,
    props.package.repository,
    props.package.version,
    props.searchUrlReferer,
    props.sortedVersions,
  ]);
  const [versions, setVersions] = useState<VersionsProps>(getAllVersions());

  useEffect(() => {
    setVersions(getAllVersions());
  }, [props.package.version, props.package.packageId, getAllVersions]);

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
            <SeeAllModal
              title={props.package.repository.kind === RepositoryKind.Helm ? 'Chart versions' : 'Versions'}
              {...versions}
              packageId={props.package.packageId}
              version={props.package.version}
            />
          </div>
        )}
      </div>

      {(() => {
        switch (props.package.repository.kind) {
          case RepositoryKind.Helm:
            return (
              <>
                {props.package.data && (
                  <>
                    {props.package.data.type &&
                      [HelmChartType.Application, HelmChartType.Library].includes(props.package.data.type) && (
                        <div>
                          <SmallTitle text="Type" />
                          <p data-testid="chartType" className="text-truncate">
                            {props.package.data.type}
                          </p>
                        </div>
                      )}

                    {props.package.data.kubeVersion && (
                      <div>
                        <SmallTitle text="Kubernetes version" />
                        <p data-testid="kubeVersion" className="text-truncate">
                          {props.package.data.kubeVersion}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            );
          case RepositoryKind.TektonTask:
            return (
              <>
                {props.package.data && props.package.data.pipelinesMinVersion && (
                  <div>
                    <SmallTitle text="Pipeline minimal version" />
                    <p data-testid="appVersion" className="text-truncate">
                      {props.package.data.pipelinesMinVersion}
                    </p>
                  </div>
                )}
              </>
            );
          default:
            return null;
        }
      })()}

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

      {props.package.repository.kind === RepositoryKind.Krew &&
        !isUndefined(props.package.data) &&
        !isNull(props.package.data) &&
        !isUndefined(props.package.data.platforms) && <Platforms platforms={props.package.data.platforms} />}

      <SmallTitle text="Keywords" />
      <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
    </>
  );
};

export default Details;
