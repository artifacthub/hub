import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { Package } from '../../types';
import ExpandableList from '../common/ExpandableList';
import RSSLinkTitle from '../common/RSSLinkTitle';
import SmallTitle from '../common/SmallTitle';
import Keywords from './Keywords';
import License from './License';
import Links from './Links';
import Maintainers from './Maintainers';

interface Props {
  package: Package;
  allVersions: JSX.Element[];
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

      <Links links={props.package.links} homeUrl={props.package.homeUrl} />

      <Maintainers maintainers={props.package.maintainers} />

      <License license={props.package.license} />

      <SmallTitle text="Keywords" />
      <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
    </>
  );
};

export default HelmChartDetails;
