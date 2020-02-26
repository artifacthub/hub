import React from 'react';
import * as semver from 'semver';
import isNull from 'lodash/isNull';
import { TiHome } from 'react-icons/ti';
import { GiEnvelope } from 'react-icons/gi';
import { FiExternalLink } from 'react-icons/fi';
import { Package, Maintainer, SearchFiltersURL } from '../../types';
import ExpandableList from '../common/ExpandableList';
import Version from './Version';
import ExternalLink from '../common/ExternalLink';
import SmallTitle from '../common/SmallTitle';
import styles from './Details.module.css';
import isUndefined from 'lodash/isUndefined';

interface Props {
  package: Package;
  searchUrlReferer: SearchFiltersURL | null;
}

const Details = (props: Props) => {
  const { availableVersions } = props.package;
  const getSortedVersions = () => {
    if (!isUndefined(availableVersions)) {
      const validVersions = availableVersions.filter((version: string) => semver.valid(version));
      const invalidVersions = availableVersions.filter((version: string) =>  !semver.valid(version));
      try {
        return [...semver.rsort(validVersions), ...invalidVersions];
      } catch {
        return availableVersions;
      }
    }
    return [];
  }

  const allVersions = getSortedVersions().map((av_version: string) => (
    <Version
      key={av_version}
      isActive={av_version === props.package.version}
      version={av_version}
      packageId={props.package.packageId}
      searchUrlReferer={props.searchUrlReferer}
    />
  ));

  return (
    <>
      <SmallTitle text="Application version" />
      <p className="text-truncate">{props.package.appVersion || '-'}</p>

      <SmallTitle text="Chart Versions" />
      {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
        <p>-</p>
      ) : (
        <div className="mb-3">
          <ExpandableList items={allVersions} />
        </div>
      )}

      <SmallTitle text="Links" />
      {isUndefined(props.package.homeUrl) || isNull(props.package.homeUrl) ? (
        <p>-</p>
      ) : (
        <ExternalLink href={props.package.homeUrl} className="text-primary d-flex align-items-center mb-3">
          <>
            <TiHome className="text-muted mr-2" />
            Home url
            <span className={styles.smallIcon}><FiExternalLink className="ml-1" /></span>
          </>
        </ExternalLink>
      )}

      <SmallTitle text="Maintainers" />
      {isUndefined(props.package.maintainers) || isNull(props.package.maintainers) || props.package.maintainers.length === 0 ? (
        <p>-</p>
      ) : (
        <div className="mb-3">
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
      {isUndefined(props.package.keywords) || props.package.keywords.length === 0 ? (
        <p>-</p>
      ) : (
        <>
          {props.package.keywords.map((keyword: string) => (
            <p className="h6 d-inline" key={keyword}><span className={`badge font-weight-normal mr-2 ${styles.badge}`}>{keyword}</span></p>
          ))}
        </>
      )}
    </>
  );
}

export default Details;
