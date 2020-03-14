import React from 'react';
import * as semver from 'semver';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useHistory } from 'react-router-dom';
import { TiHome } from 'react-icons/ti';
import { GiEnvelope } from 'react-icons/gi';
import { FiExternalLink } from 'react-icons/fi';
import { Package, Maintainer, SearchFiltersURL } from '../../types';
import ExpandableList from '../common/ExpandableList';
import Version from './Version';
import ExternalLink from '../common/ExternalLink';
import SmallTitle from '../common/SmallTitle';
import prepareQueryString from '../../utils/prepareQueryString';
import styles from './Details.module.css';

interface Props {
  package: Package;
  searchUrlReferer: SearchFiltersURL | null;
}

const Details = (props: Props) => {
  const history = useHistory();
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
      packageItem={{
        ...props.package,
        version: av_version,
      }}
      searchUrlReferer={props.searchUrlReferer}
    />
  ));

  return (
    <>
      <SmallTitle text="Application version" />
      <p data-testid="appVersion" className="text-truncate">{props.package.appVersion || '-'}</p>

      <SmallTitle text="Chart Versions" />
      {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
        <p data-testid="chartVersions">-</p>
      ) : (
        <div className="mb-3" data-testid="chartVersions">
          <ExpandableList items={allVersions} />
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
      {isUndefined(props.package.keywords) || isNull(props.package.keywords) || props.package.keywords.length === 0 ? (
        <p data-testid="keywords">-</p>
      ) : (
        <span data-testid="keywords">
          {props.package.keywords.map((keyword: string) => (
            <button
              className={`btn btn-sm d-inline badge font-weight-normal mr-2 mb-2 mb-sm-0 ${styles.badge}`}
              key={keyword}
              onClick={() => {
                history.push({
                  pathname: '/search',
                  search: prepareQueryString({
                    text: keyword,
                    pageNumber: 1,
                    filters: {},
                    deprecated: false,
                  }),
                });
              }}
            >
              {keyword}
            </button>
          ))}
        </span>
      )}
    </>
  );
}

export default Details;
