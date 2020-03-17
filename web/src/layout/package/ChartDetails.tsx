import React from 'react';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { TiHome } from 'react-icons/ti';
import { GiEnvelope } from 'react-icons/gi';
import { FiExternalLink } from 'react-icons/fi';
import { Package, Maintainer } from '../../types';
import ExpandableList from '../common/ExpandableList';
import ExternalLink from '../common/ExternalLink';
import SmallTitle from '../common/SmallTitle';
import Keywords from './Keywords';
import styles from './ChartDetails.module.css';

interface Props {
  package: Package;
  allVersions: JSX.Element[];
}

const ChartDetails = (props: Props) => {
  return (
    <>
      <SmallTitle text="Application version" />
      <p data-testid="appVersion" className="text-truncate">{props.package.appVersion || '-'}</p>

      <SmallTitle text="Chart Versions" />
      {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
        <p data-testid="chartVersions">-</p>
      ) : (
        <div className="mb-3" data-testid="chartVersions">
          <ExpandableList items={props.allVersions} />
        </div>
      )}

      <SmallTitle text="Links" />
      {isUndefined(props.package.homeUrl) || isNull(props.package.homeUrl) ? (
        <p data-testid="homeUrl">-</p>
      ) : (
        <ExternalLink data-testid="homeUrl" href={props.package.homeUrl} className="text-primary d-flex align-items-center mb-3">
          <>
            <TiHome className="text-muted mr-2" />
            Home url
            <span className={styles.smallIcon}><FiExternalLink className="ml-1" /></span>
          </>
        </ExternalLink>
      )}

      <SmallTitle text="Maintainers" />
      {isUndefined(props.package.maintainers) || isNull(props.package.maintainers) || props.package.maintainers.length === 0 ? (
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
      <Keywords keywords={props.package.keywords} />
    </>
  );
}

export default ChartDetails;
