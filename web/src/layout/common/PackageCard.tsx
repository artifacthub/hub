import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaStar } from 'react-icons/fa';
import { Link, useHistory } from 'react-router-dom';

import { Package, PackageKind, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import prepareQueryString from '../../utils/prepareQueryString';
import prettifyNumber from '../../utils/prettifyNumber';
import Image from './Image';
import OrganizationInfo from './OrganizationInfo';
import styles from './PackageCard.module.css';
import PackageIcon from './PackageIcon';

interface Props {
  package: Package;
  saveScrollPosition?: () => void;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const PackageCard = (props: Props) => {
  const history = useHistory();
  return (
    <div className="col-12 py-sm-3 py-2" role="listitem">
      <div className={`card h-100 ${styles.card}`}>
        <Link
          data-testid="link"
          className={`text-decoration-none ${styles.link}`}
          onClick={() => {
            if (!isUndefined(props.saveScrollPosition)) {
              props.saveScrollPosition();
            }
          }}
          to={{
            pathname: buildPackageURL(props.package),
            state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
          }}
        >
          <div className={`card-body position-relative ${styles.body}`}>
            <div className="d-flex align-items-start justify-content-between mb-3">
              <div className={`d-flex align-items-center flex-grow-1 ${styles.truncateWrapper}`}>
                <div
                  className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}
                >
                  <Image
                    imageId={props.package.logoImageId}
                    alt={`Logo ${props.package.displayName || props.package.name}`}
                    className={styles.image}
                  />
                </div>

                <div className={`ml-3 flex-grow-1 ${styles.truncateWrapper}`}>
                  <div className={`card-title font-weight-bolder mb-2 ${styles.title}`}>
                    <div className="h5 d-flex flex-row align-items-center">
                      {props.package.displayName || props.package.name}
                      {!isNull(props.package.deprecated) && props.package.deprecated && (
                        <div
                          className={`d-none d-sm-flex badge badge-pill ml-2 mt-1 text-uppercase ${styles.deprecatedBadge}`}
                        >
                          Deprecated
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`card-subtitle d-flex flex-wrap mw-100 mt-1 ${styles.subtitle}`}>
                    {!isUndefined(props.package.organizationName) && props.package.organizationName && (
                      <OrganizationInfo
                        className="mr-2"
                        organizationName={props.package.organizationName}
                        organizationDisplayName={props.package.organizationDisplayName}
                        deprecated={props.package.deprecated}
                        visibleLegend
                      />
                    )}

                    {!isNull(props.package.userAlias) && (
                      <div className="mr-2 text-truncate">
                        <span className="text-muted text-uppercase mr-1">User:</span>
                        <button
                          data-testid="userLink"
                          className={`p-0 border-0 text-dark ${styles.link}`}
                          onClick={(e) => {
                            e.preventDefault();
                            history.push({
                              pathname: '/packages/search',
                              search: prepareQueryString({
                                pageNumber: 1,
                                filters: {
                                  user: [props.package.userAlias!],
                                },
                                deprecated: isNull(props.package.deprecated) ? false : props.package.deprecated,
                              }),
                            });
                          }}
                        >
                          {props.package.userAlias}
                        </button>
                      </div>
                    )}

                    {(() => {
                      switch (props.package.kind) {
                        case PackageKind.Chart:
                          return (
                            <>
                              <div className="mr-2 text-truncate">
                                <span className="text-muted text-uppercase mr-1">Repo:</span>
                                <button
                                  data-testid="repoLink"
                                  className={`p-0 border-0 text-dark ${styles.link}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    history.push({
                                      pathname: '/packages/search',
                                      search: prepareQueryString({
                                        pageNumber: 1,
                                        filters: {
                                          repo: [props.package.chartRepository!.name],
                                        },
                                        deprecated: isNull(props.package.deprecated) ? false : props.package.deprecated,
                                      }),
                                    });
                                  }}
                                >
                                  {props.package.chartRepository!.displayName || props.package.chartRepository!.name}
                                </button>
                              </div>

                              <div className="mr-2 text-truncate">
                                <span className="text-muted text-uppercase mr-1">Version: </span>
                                {props.package.version || '-'}
                              </div>

                              <div className="text-truncate">
                                <span className="text-muted text-uppercase mr-1">App version: </span>
                                {props.package.appVersion || '-'}
                              </div>
                            </>
                          );

                        case PackageKind.Falco:
                        case PackageKind.Opa:
                          return (
                            <div className="text-truncate">
                              <span className="text-muted text-uppercase mr-1">Version: </span>
                              {props.package.version || '-'}
                            </div>
                          );

                        default:
                          return null;
                      }
                    })()}
                  </div>
                </div>
              </div>

              <div className={`d-flex align-items-center text-uppercase ${styles.kind}`}>
                {!isUndefined(props.package.stars) && !isNull(props.package.stars) && (
                  <span className={`badge badge-pill badge-light mr-2 ${styles.starBadge}`}>
                    <div className="d-flex align-items-center">
                      <FaStar className="mr-1" />
                      <div className={styles.starBadgeNumber}>{prettifyNumber(props.package.stars)}</div>
                    </div>
                  </span>
                )}
                <PackageIcon className={styles.icon} kind={props.package.kind} />
              </div>
            </div>

            <p className={`mb-0 card-text overflow-hidden ${styles.description}`}>{props.package.description}</p>

            {!isNull(props.package.deprecated) && props.package.deprecated && (
              <div className={`d-inline d-sm-none badge badge-pill mt-1 text-uppercase ${styles.deprecatedBadge}`}>
                Deprecated
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
};

export default PackageCard;
