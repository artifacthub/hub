import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { GiEnvelope } from 'react-icons/gi';

import { Maintainer, Package } from '../../types';
import ExpandableList from '../common/ExpandableList';
import ExternalLink from '../common/ExternalLink';
import SmallTitle from '../common/SmallTitle';
import Keywords from './Keywords';
import License from './License';
import Links from './Links';

interface Props {
  package: Package;
  allVersions: JSX.Element[];
}

const ChartDetails = (props: Props) => {
  return (
    <>
      <SmallTitle text="Application version" />
      <p data-testid="appVersion" className="text-truncate">
        {props.package.appVersion || '-'}
      </p>
      <SmallTitle text="Chart Versions" />
      {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
        <p data-testid="chartVersions">-</p>
      ) : (
        <div className="mb-3" data-testid="chartVersions">
          <ExpandableList items={props.allVersions} />
        </div>
      )}

      <Links links={props.package.links} homeUrl={props.package.homeUrl} />

      <License license={props.package.license} />

      <SmallTitle text="Maintainers" />
      {isUndefined(props.package.maintainers) ||
      isNull(props.package.maintainers) ||
      props.package.maintainers.length === 0 ? (
        <p data-testid="maintainers">-</p>
      ) : (
        <div data-testid="maintainers" className="mb-3">
          {props.package.maintainers.map((maintainer: Maintainer) => (
            <div className="mb-1" key={maintainer.email}>
              <ExternalLink href={`mailto:${maintainer.email}`} className="text-primary py-1 py-sm-0">
                <div className="d-flex align-items-center">
                  <GiEnvelope className="text-muted mr-2 h6 mb-0" />
                  <>{maintainer.name || maintainer.email}</>
                </div>
              </ExternalLink>
            </div>
          ))}
        </div>
      )}
      <SmallTitle text="Keywords" />
      <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
    </>
  );
};

export default ChartDetails;
