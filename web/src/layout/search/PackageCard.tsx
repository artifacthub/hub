import isNull from 'lodash/isNull';
import React from 'react';
import { Link, useHistory } from 'react-router-dom';

import { Package, PackageKind, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import prepareQueryString from '../../utils/prepareQueryString';
import Image from '../common/Image';
import PackageIcon from '../common/PackageIcon';
import styles from './PackageCard.module.css';

interface Props {
  package: Package;
  saveScrollPosition: () => void;
  searchUrlReferer: SearchFiltersURL | null;
}

const PackageCard = (props: Props) => {
  const history = useHistory();
  return (
    <div className="col-12 py-sm-3 py-2" role="listitem">
      <div className={`card h-100 ${styles.card}`}>
        <Link
          data-testid="link"
          className={`text-decoration-none ${styles.link}`}
          onClick={props.saveScrollPosition}
          to={{
            pathname: buildPackageURL(props.package),
            state: props.searchUrlReferer,
          }}
        >
          <div className={`card-body ${styles.body}`}>
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
                    {(() => {
                      switch (props.package.kind) {
                        case PackageKind.Chart:
                          return (
                            <>
                              <div className="mr-2 text-truncate">
                                <span className="text-muted text-uppercase mr-1">Repository: </span>
                                <button
                                  data-testid="repoLink"
                                  className={`p-0 border-0 ${styles.link}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    history.push({
                                      pathname: '/search',
                                      search: prepareQueryString({
                                        pageNumber: 1,
                                        filters: {
                                          repo: [props.package.chartRepository!.name],
                                        },
                                        deprecated: isNull(props.package.deprecated) ? false : props.package.deprecated,
                                      }),
                                      state: { fromSearchCard: true },
                                    });
                                  }}
                                >
                                  <u>
                                    {props.package.chartRepository!.displayName || props.package.chartRepository!.name}
                                  </u>
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
