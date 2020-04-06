import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaStar } from 'react-icons/fa';
import { Link, useHistory } from 'react-router-dom';

import { Package, PackageKind } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import prepareQueryString from '../../utils/prepareQueryString';
import prettifyNumber from '../../utils/prettifyNumber';
import Image from '../common/Image';
import OrganizationInfo from '../common/OrganizationInfo';
import PackageIcon from '../common/PackageIcon';
import styles from './PackageCard.module.css';

interface Props {
  package: Package;
}

const PackageCard = (props: Props) => {
  const history = useHistory();

  return (
    <div className={`card mb-3 mw-100 ${styles.card}`}>
      <Link
        className={`text-decoration-none ${styles.link}`}
        to={{
          pathname: buildPackageURL(props.package),
        }}
      >
        <div className={`card-body d-flex ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between flex-grow-1 mw-100">
            <div className={`d-flex align-items-center flex-grow-1 h-100 ${styles.truncateWrapper}`}>
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
                <div className={`card-title font-weight-bolder ${styles.title}`}>
                  <div className="h6 text-truncate">{props.package.displayName || props.package.name}</div>
                </div>

                <div className={`card-subtitle align-items-center ${styles.subtitle}`}>
                  {!isUndefined(props.package.organizationName) && props.package.organizationName && (
                    <OrganizationInfo
                      organizationName={props.package.organizationName}
                      organizationDisplayName={props.package.organizationDisplayName}
                      deprecated={props.package.deprecated}
                    />
                  )}

                  {!isNull(props.package.userAlias) && (
                    <div className="mr-2 text-truncate">
                      <span className="text-muted text-uppercase mr-1">User:</span>
                      <button
                        className={`p-0 border-0 ${styles.link}`}
                        onClick={(e) => {
                          e.preventDefault();
                          history.push({
                            pathname: '/packages/search',
                            search: prepareQueryString({
                              pageNumber: 1,
                              filters: {
                                user: [props.package.userAlias!],
                              },
                              deprecated: false,
                            }),
                          });
                        }}
                      >
                        <u>{props.package.userAlias}</u>
                      </button>
                    </div>
                  )}

                  {(() => {
                    switch (props.package.kind) {
                      case PackageKind.Chart:
                        return (
                          <>
                            <div className="mr-2 text-truncate">
                              <span className="text-muted text-uppercase mr-1">Repo: </span>
                              <button
                                className={`p-0 border-0 ${styles.link}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  history.push({
                                    pathname: '/packages/search',
                                    search: prepareQueryString({
                                      pageNumber: 1,
                                      filters: {
                                        repo: [props.package.chartRepository!.name],
                                      },
                                      deprecated: false,
                                    }),
                                  });
                                }}
                              >
                                <u>
                                  {props.package.chartRepository!.displayName || props.package.chartRepository!.name}
                                </u>
                              </button>
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

            <div className={`d-flex align-items-center text-uppercase ml-2 ${styles.kind}`}>
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
      </Link>
    </div>
  );
};

export default PackageCard;
