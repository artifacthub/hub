import { isNull } from 'lodash';
import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { Package, SearchFiltersURL } from '../../types';
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

interface Props {
  package: Package;
  allVersions: JSX.Element[];
  visibleSecurityReport: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const HelmChartDetails = (props: Props) => {
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

      <div>
        <RSSLinkTitle title="Chart Versions" package={props.package} />
        {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
          <p data-testid="chartVersions">-</p>
        ) : (
          <div className="mb-3" data-testid="chartVersions">
            <ExpandableList items={props.allVersions} visibleItems={3} />
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

      {!isUndefined(props.package.data) && !isNull(props.package.data) && (
        <Dependencies dependencies={props.package.data.dependencies} />
      )}

      <SmallTitle text="Keywords" />
      <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
    </>
  );
};

export default HelmChartDetails;
