import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import React from 'react';
import { FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { Package, PackageKind } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import prettifyNumber from '../../utils/prettifyNumber';
import Image from '../common/Image';
import PackageIcon from '../common/PackageIcon';
import styles from './MobilePackageCard.module.css';

interface Props {
  package: Package;
}

const MobilePackageCard = (props: Props) => {
  const isRepeatedRepoName = (): boolean => {
    if (props.package.kind !== PackageKind.Chart || !isNull(props.package.userAlias)) return false;
    return (
      (props.package.chartRepository!.displayName || props.package.chartRepository!.name) ===
      (props.package.organizationDisplayName || props.package.organizationName)
    );
  };

  return (
    <div className={`card mb-3 w-100 ${styles.card}`}>
      <Link
        data-testid="mobilePackageLink"
        className={`text-decoration-none ${styles.link}`}
        to={{
          pathname: buildPackageURL(props.package),
        }}
      >
        <div className={`card-body d-flex flex-column ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between flex-grow-1 mw-100">
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

              <div className={`ml-3 h-100 flex-grow-1 ${styles.truncateWrapper}`}>
                <div className="h-50">
                  <div className="h-100 d-flex flex-row justify-content-between">
                    <div className={`align-self-end text-truncate card-title mb-0 font-weight-bolder ${styles.title}`}>
                      <div className="h6 text-truncate mr-2">{props.package.displayName || props.package.name}</div>
                    </div>

                    <div className={`align-self-start d-flex align-items-center text-uppercase ${styles.kind}`}>
                      {!isUndefined(props.package.stars) && !isNull(props.package.stars) && (
                        <span className={`badge badge-pill badge-light mr-2 ${styles.starBadge}`}>
                          <div className="d-flex align-items-center">
                            <FaStar className="mr-1" />
                            <div>{prettifyNumber(props.package.stars)}</div>
                          </div>
                        </span>
                      )}
                      <PackageIcon className={styles.icon} kind={props.package.kind} />
                    </div>
                  </div>
                </div>

                <div className={`card-subtitle text-truncate h-50 align-items-center ${styles.subtitle}`}>
                  {(() => {
                    switch (props.package.kind) {
                      case PackageKind.Chart:
                        return (
                          <>
                            <div className="d-flex flex-row align-items-baseline text-truncate">
                              <span className="text-muted text-uppercase mr-1">Repo: </span>
                              {!isUndefined(props.package.organizationName) &&
                                props.package.organizationName &&
                                !isRepeatedRepoName() && (
                                  <>
                                    <div className={`p-0 border-0 text-truncate text-dark ${styles.mx50}`}>
                                      {props.package.organizationDisplayName || props.package.organizationName}
                                    </div>
                                    <span className="px-1">/</span>
                                  </>
                                )}

                              {!isNull(props.package.userAlias) && (
                                <>
                                  <div className={`p-0 border-0 text-truncate text-dark ${styles.mx50}`}>
                                    {props.package.userAlias}
                                  </div>
                                  <span className="px-1">/</span>
                                </>
                              )}

                              <div className={`text-truncate p-0 border-0 text-dark ${styles.mx50}`}>
                                {props.package.chartRepository!.displayName || props.package.chartRepository!.name}
                              </div>
                            </div>

                            <div className="text-truncate">
                              <span className="text-muted text-uppercase mr-1">Version: </span>
                              {props.package.version || '-'}
                            </div>
                          </>
                        );

                      case PackageKind.Falco:
                      case PackageKind.Opa:
                        return (
                          <>
                            {!isUndefined(props.package.organizationName) && props.package.organizationName && (
                              <>
                                <span className="text-muted text-uppercase mr-1">Org: </span>
                                <div className={`d-inline text-truncate text-dark ${styles.mx50}`}>
                                  {props.package.organizationDisplayName || props.package.organizationName}
                                </div>
                              </>
                            )}

                            {!isNull(props.package.userAlias) && (
                              <div className="mr-2 text-truncate">
                                <span className="text-muted text-uppercase mr-1">User:</span>
                                <div className={`d-inline text-truncate text-dark ${styles.mx50}`}>
                                  {props.package.userAlias}
                                </div>
                              </div>
                            )}
                            <div className="text-truncate">
                              <span className="text-muted text-uppercase mr-1">Version: </span>
                              {props.package.version || '-'}
                            </div>
                          </>
                        );

                      default:
                        return null;
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <small className={`mb-0 ${styles.description}`}>{props.package.description}</small>
          </div>

          <small className={`text-muted text-right text-nowrap mt-3 ${styles.date}`}>
            Updated {moment(props.package.createdAt * 1000).fromNow()}
          </small>

          {!isNull(props.package.deprecated) && props.package.deprecated && (
            <div>
              <div className={`badge badge-pill mt-1 text-uppercase ${styles.deprecatedBadge}`}>Deprecated</div>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default MobilePackageCard;
