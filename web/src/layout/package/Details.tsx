import classnames from 'classnames';
import { isNull, uniq } from 'lodash';
import isUndefined from 'lodash/isUndefined';
import { useCallback, useEffect, useState } from 'react';

import {
  ArgoTemplateData,
  Channel,
  HelmChartType,
  KeptnData,
  KubewardenData,
  KyvernoData,
  Package,
  PackageViewsStats,
  RepositoryKind,
  Version as VersionData,
} from '../../types';
import RSSLinkTitle from '../common/RSSLinkTitle';
import SeeAllModal from '../common/SeeAllModal';
import SmallTitle from '../common/SmallTitle';
import CapabilityLevel from './CapabilityLevel';
import ContainerAlternativeLocations from './ContainerAlternativeLocations';
import ContainerRegistry from './ContainerRegistry';
import ContainersImages from './ContainersImages';
import Dependencies from './Dependencies';
import styles from './Details.module.css';
import Keywords from './Keywords';
import Last30DaysViews from './Last30DaysViews';
import LastYearActivity from './LastYearActivity';
import License from './License';
import Links from './Links';
import Maintainers from './Maintainers';
import Platforms from './Platforms';
import SecurityReport from './securityReport';
import TasksInPipeline from './TasksInPipeline';
import Version from './Version';
import VersionInRow from './VersionInRow';

interface Props {
  package: Package;
  sortedVersions: VersionData[];
  visibleSecurityReport: boolean;
  visibleImage?: string | null;
  visibleTarget?: string | null;
  visibleSection?: string | null;
  channels?: Channel[] | null;
  eventId?: string | null;
  viewsStats?: PackageViewsStats;
  version?: string;
}

interface VersionsProps {
  items: JSX.Element[];
  itemsForModal: JSX.Element[] | JSX.Element;
}

const getVersionsTitle = (repoKind: RepositoryKind): string => {
  switch (repoKind) {
    case RepositoryKind.Helm:
      return 'Chart versions';
    case RepositoryKind.Container:
      return 'Tags';
    default:
      return 'Versions';
  }
};

const Details = (props: Props) => {
  const getAllVersions = useCallback((): VersionsProps => {
    let items: JSX.Element[] = [];
    let itemsForModal: JSX.Element[] = [];

    const getLinkedChannelsToVersion = (version: string): string[] | undefined => {
      let linked: string[] | undefined;
      if (props.channels) {
        const channels: string[] = [];
        props.channels.forEach((ch: Channel) => {
          if (ch.version === version) {
            channels.push(ch.name);
          }
        });
        // Sort channels: using defaultChannel as first one
        if (channels.length > 0) {
          const sortedChannels = uniq(channels).sort((a, b) => {
            if (a === props.package.defaultChannel) return -1;
            if (b === props.package.defaultChannel) return 1;
            return 0;
          });

          linked = sortedChannels;
        }
      }

      return linked;
    };

    props.sortedVersions.forEach((av_version: VersionData, index: number) => {
      const linkedChannels = getLinkedChannelsToVersion(av_version.version);

      items.push(
        <Version
          key={`${av_version.version}_${index}`}
          isActive={av_version.version === props.package.version}
          {...av_version}
          linkedChannels={linkedChannels}
          normalizedName={props.package.normalizedName}
          repository={props.package.repository}
        />
      );

      itemsForModal.push(
        <VersionInRow
          key={`${av_version.version}_inline_${index}`}
          isActive={av_version.version === props.package.version}
          {...av_version}
          linkedChannels={linkedChannels}
          normalizedName={props.package.normalizedName}
          repository={props.package.repository}
        />
      );
    });

    return {
      items,
      itemsForModal: (
        <table className={`table table-striped table-bordered table-sm mb-0 ${styles.table}`}>
          <thead>
            <tr className={styles.tableTitle}>
              <th scope="col">
                <span className="px-1">Version</span>
              </th>
              <th scope="col" className={styles.releasedCell}>
                <span className="px-1">Released</span>
              </th>
            </tr>
          </thead>
          <tbody className={styles.body}>{itemsForModal}</tbody>
        </table>
      ),
    };
  }, [
    props.channels,
    props.package.normalizedName,
    props.package.repository,
    props.package.version,
    props.sortedVersions,
    props.package.defaultChannel,
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
          case RepositoryKind.Falco:
          case RepositoryKind.OPA:
          case RepositoryKind.TBAction:
          case RepositoryKind.KedaScaler:
          case RepositoryKind.CoreDNS:
          case RepositoryKind.Keptn:
          case RepositoryKind.Kubewarden:
          case RepositoryKind.Gatekeeper:
            return (
              <>
                {props.package.appVersion && (
                  <div>
                    <SmallTitle text="Application version" />
                    <p data-testid="appVersion" className={`text-truncate ${styles.text}`}>
                      {props.package.appVersion}
                    </p>
                  </div>
                )}
              </>
            );

          case RepositoryKind.Container:
            return (
              <>
                <div className="mb-3">
                  <SmallTitle text="Registry" />
                  <ContainerRegistry url={props.package.repository.url} />
                </div>
                {props.package.data && props.package.data.alternativeLocations && (
                  <ContainerAlternativeLocations locations={props.package.data.alternativeLocations} />
                )}
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

          default:
            return null;
        }
      })()}

      <div>
        <RSSLinkTitle
          title={getVersionsTitle(props.package.repository.kind)}
          normalizedName={props.package.normalizedName}
          repository={props.package.repository}
          version={props.package.version!}
        />
        {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
          <p data-testid="versions">-</p>
        ) : (
          <div className="mb-3" data-testid="versions">
            <SeeAllModal
              title={getVersionsTitle(props.package.repository.kind)}
              {...versions}
              packageId={props.package.packageId}
              version={props.package.version}
            />
          </div>
        )}
      </div>

      <div>
        <LastYearActivity versions={props.sortedVersions} />
      </div>

      <div>
        <Last30DaysViews repoKind={props.package.repository.kind} stats={props.viewsStats} version={props.version} />
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
                          <p data-testid="chartType" className={`text-truncate ${styles.text}`}>
                            {props.package.data.type}
                          </p>
                        </div>
                      )}

                    {props.package.data.kubeVersion && (
                      <div>
                        <SmallTitle text="Kubernetes version" />
                        <p data-testid="kubeVersion" className={`text-truncate ${styles.text}`}>
                          {props.package.data.kubeVersion}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            );

          case RepositoryKind.Kyverno:
            const subjects: string[] =
              props.package.data &&
              !isUndefined(props.package.data[KyvernoData.Subject]) &&
              props.package.data[KyvernoData.Subject] !== ''
                ? props.package.data[KyvernoData.Subject]!.split(',')
                : [];

            return (
              <>
                {props.package.data && props.package.data.kyvernoVersion && (
                  <div>
                    <SmallTitle text="Minimal version" />
                    <p data-testid="appVersion" className={`text-truncate ${styles.text}`}>
                      {props.package.data.kyvernoVersion}
                    </p>
                  </div>
                )}
                {props.package.data && props.package.data.kyvernoKubernetesVersion && (
                  <div>
                    <SmallTitle text="Kubernetes version" />
                    <p data-testid="kubernetesVersion" className={`text-truncate ${styles.text}`}>
                      {props.package.data.kyvernoKubernetesVersion}
                    </p>
                  </div>
                )}
                {props.package.data && props.package.data.kyvernoCategory && (
                  <div>
                    <SmallTitle text="Category" />
                    <p data-testid="category" className={`text-truncate ${styles.text}`}>
                      {props.package.data.kyvernoCategory}
                    </p>
                  </div>
                )}
                {subjects.length > 0 && (
                  <div>
                    <SmallTitle text="Subjects" />
                    {subjects.map((subject: string, index: number) => (
                      <p
                        data-testid="kyvernoSubject"
                        className={classnames('text-truncate', styles.text, { 'mb-1': index + 1 !== subjects.length })}
                        key={`kyverno-subject-${subject}`}
                      >
                        <div className="d-flex align-items-center">
                          <span className="pe-1">&#183;</span>
                          <small>{subject}</small>
                        </div>
                      </p>
                    ))}
                  </div>
                )}
              </>
            );

          case RepositoryKind.TektonTask:
            return (
              <>
                {props.package.data && props.package.data.pipelinesMinVersion && (
                  <div>
                    <SmallTitle text="Pipeline minimal version" />
                    <p data-testid="appVersion" className={`text-truncate ${styles.text}`}>
                      {props.package.data.pipelinesMinVersion}
                    </p>
                  </div>
                )}
              </>
            );

          case RepositoryKind.TektonPipeline:
            return (
              <>
                {props.package.data && props.package.data.pipelinesMinVersion && (
                  <div>
                    <SmallTitle text="Pipeline minimal version" />
                    <p data-testid="appVersion" className={`text-truncate ${styles.text}`}>
                      {props.package.data.pipelinesMinVersion}
                    </p>
                  </div>
                )}

                {props.package.data && (
                  <TasksInPipeline tasks={props.package.data.tasks} kind={props.package.repository.kind} />
                )}
              </>
            );

          case RepositoryKind.Keptn:
            const kinds: string[] =
              props.package.data &&
              !isUndefined(props.package.data[KeptnData.Kind]) &&
              props.package.data[KeptnData.Kind] !== ''
                ? props.package.data[KeptnData.Kind]!.split(',')
                : [];

            return (
              <>
                {props.package.data &&
                  !isUndefined(props.package.data[KeptnData.Version]) &&
                  props.package.data[KeptnData.Version] !== '' && (
                    <div>
                      <SmallTitle text="Keptn version" />
                      <p data-testid="keptnVersion" className={`text-truncate ${styles.text}`}>
                        {props.package.data[KeptnData.Version]}
                      </p>
                    </div>
                  )}
                {kinds.length > 0 && (
                  <div>
                    <SmallTitle text="Kind" />
                    {kinds.map((kind: string, index: number) => (
                      <p
                        data-testid="keptnKind"
                        className={classnames('text-truncate', styles.text, { 'mb-1': index + 1 !== kinds.length })}
                        key={`keptn-kind-${kind}`}
                      >
                        <div className="d-flex align-items-center">
                          <span className="pe-1">&#183;</span>
                          <small>{kind}</small>
                        </div>
                      </p>
                    ))}
                  </div>
                )}
              </>
            );

          case RepositoryKind.Kubewarden:
            const resources: string[] =
              props.package.data &&
              !isUndefined(props.package.data[KubewardenData.Resources]) &&
              props.package.data[KubewardenData.Resources] !== ''
                ? props.package.data[KubewardenData.Resources]!.split(',')
                : [];

            const isMutationTrue =
              props.package.data &&
              !isUndefined(props.package.data[KubewardenData.Mutation]) &&
              props.package.data[KubewardenData.Mutation] === 'true';
            return (
              <>
                {resources.length > 0 && (
                  <div>
                    <SmallTitle text="Resources" />
                    {resources.map((resource: string) => (
                      <p
                        data-testid="kubewardenResource"
                        className={`text-truncate mb-1 ${styles.text}`}
                        key={`kubewarden-resource-${resource}`}
                      >
                        <div className="d-flex align-items-center">
                          <span className="pe-1">&#183;</span>
                          <small>{resource}</small>
                        </div>
                      </p>
                    ))}
                  </div>
                )}
                {props.package.data && !isUndefined(props.package.data[KubewardenData.Mutation]) && (
                  <div className="mb-3 text-muted">
                    <small>{`Validation ${isMutationTrue ? '+ Mutation ' : ''}policy`}</small>
                  </div>
                )}
              </>
            );

          case RepositoryKind.ArgoTemplate:
            return (
              <>
                {props.package.data && props.package.data[ArgoTemplateData.Version] && (
                  <div>
                    <SmallTitle text="Workflows version" />
                    <p data-testid="argoVersion" className={`text-truncate ${styles.text}`}>
                      {props.package.data[ArgoTemplateData.Version]}
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
        repoKind={props.package.repository.kind}
        disabledReport={props.package.repository.scannerDisabled || false}
        allContainersImagesWhitelisted={props.package.allContainersImagesWhitelisted || false}
        summary={props.package.securityReportSummary}
        packageId={props.package.packageId}
        version={props.package.version!}
        ts={props.package.ts}
        createdAt={props.package.securityReportCreatedAt}
        visibleSecurityReport={props.visibleSecurityReport}
        visibleImage={props.visibleImage}
        visibleTarget={props.visibleTarget}
        visibleSection={props.visibleSection}
        eventId={props.eventId}
        containers={props.package.containersImages || []}
      />

      {(RepositoryKind.OLM === props.package.repository.kind ||
        (RepositoryKind.Helm === props.package.repository.kind &&
          !isUndefined(props.package.isOperator) &&
          props.package.isOperator)) && <CapabilityLevel capabilityLevel={props.package.capabilities} />}

      {props.package.provider && (
        <>
          <div>
            <SmallTitle text="Provider" />
            <p className={`text-truncate ${styles.text}`}>{props.package.provider}</p>
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
            linkClassName="py-1 py-sm-0 text-primary"
            linkContentClassName={styles.text}
            visibleIcon
          />
        </>
      )}

      <ContainersImages
        containers={props.package.containersImages}
        packageId={props.package.packageId}
        kind={props.package.repository.kind}
      />

      {props.package.repository.kind === RepositoryKind.Helm &&
        !isUndefined(props.package.data) &&
        !isNull(props.package.data) && (
          <Dependencies dependencies={props.package.data.dependencies} packageId={props.package.packageId} />
        )}

      {props.package.data && props.package.data.platforms && (
        <Platforms title="Supported Platforms" platforms={props.package.data.platforms} />
      )}

      <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
    </>
  );
};

export default Details;
