import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import moment from 'moment';
import React from 'react';
import { FaStar } from 'react-icons/fa';
import { Link, useHistory } from 'react-router-dom';

import { Package, RepositoryKind } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import prepareQueryString from '../../utils/prepareQueryString';
import prettifyNumber from '../../utils/prettifyNumber';
import Image from './Image';
import OrganizationInfo from './OrganizationInfo';
import styles from './PackageInfo.module.css';
import RepositoryIcon from './RepositoryIcon';
import RepositoryInfo from './RepositoryInfo';
import SignedBadge from './SignedBadge';

interface Props {
  package: Package;
  visibleSignedBadge?: boolean;
  withPackageLinks: boolean;
  breakpointForInfoSection?: string;
}

const PackageInfo = (props: Props) => {
  const history = useHistory();

  const createdAt = (
    <small className={`text-muted text-nowrap ${styles.date}`}>
      Updated {moment(props.package.createdAt * 1000).fromNow()}
    </small>
  );

  const starsAndKindInfo = (
    <div className={`align-self-start d-flex align-items-center text-uppercase ml-auto ${styles.kind}`}>
      {!isUndefined(props.package.stars) && !isNull(props.package.stars) && (
        <span className={`badge badge-pill badge-light mr-2 ${styles.starBadge}`}>
          <div className="d-flex align-items-center">
            <FaStar className="mr-1" />
            <div>{prettifyNumber(props.package.stars)}</div>
          </div>
        </span>
      )}
      <RepositoryIcon className={styles.icon} kind={props.package.repository.kind} />
    </div>
  );

  const badges = (
    <>
      {props.package.deprecated && (
        <div className={`badge badge-pill text-uppercase mb-1 ${styles.deprecatedBadge}`}>Deprecated</div>
      )}
      {!isUndefined(props.visibleSignedBadge) && props.visibleSignedBadge && (
        <SignedBadge
          signed={props.package.signed}
          className={classnames('mb-1', { 'ml-3': !isNull(props.package.deprecated) && props.package.deprecated })}
        />
      )}
    </>
  );

  const packageImage = (
    <div
      className={`d-flex align-items-center justify-content-center overflow-hidden rounded-circle p-1 ${styles.imageWrapper} imageWrapper`}
    >
      <Image
        imageId={props.package.logoImageId}
        alt={`Logo ${props.package.displayName || props.package.name}`}
        className={styles.image}
      />
    </div>
  );

  return (
    <>
      <div className="d-flex align-items-start justify-content-between flex-grow-1 mw-100">
        <div className={`d-flex align-items-strecht flex-grow-1 h-100 ${styles.truncateWrapper}`}>
          {props.withPackageLinks ? (
            <Link
              className={`text-decoration-none text-reset ${styles.link}`}
              to={{
                pathname: buildPackageURL(props.package),
              }}
            >
              {packageImage}
            </Link>
          ) : (
            <>{packageImage}</>
          )}

          <div
            className={`d-flex flex-column justify-content-between ml-3 my-1 my-md-0 flex-grow-1 ${styles.truncateWrapper} ${styles.titleWrapper}`}
          >
            <div className="text-truncate card-title mb-0">
              <div className="d-flex flex-row align-items-center">
                {props.withPackageLinks ? (
                  <Link
                    data-testid="packageLink"
                    className={`${styles.link} text-reset text-truncate`}
                    to={{
                      pathname: buildPackageURL(props.package),
                    }}
                  >
                    <div className={`text-truncate ${styles.title}`}>
                      {props.package.displayName || props.package.name}
                    </div>
                  </Link>
                ) : (
                  <div className={`text-truncate ${styles.title}`}>
                    {props.package.displayName || props.package.name}
                  </div>
                )}

                <div className="d-none d-lg-inline-block ml-3">{badges}</div>
              </div>
            </div>

            <div className={`card-subtitle text-truncate align-items-baseline ${styles.subtitle}`}>
              <RepositoryInfo
                repository={props.package.repository}
                deprecated={props.package.deprecated}
                className="d-inline-block d-md-none text-truncate w-100"
              />

              <div className={`d-none d-md-flex flex-row align-items-start w-100 ${styles.wrapper}`}>
                <div className={`d-flex flex-row align-items-baseline text-truncate ${styles.mx50}`}>
                  {!isUndefined(props.package.repository.organizationName) &&
                    props.package.repository.organizationName && (
                      <OrganizationInfo
                        className="mr-0 d-flex flex-row align-items-baseline mw-100"
                        btnClassName="text-truncate mw-100"
                        organizationName={props.package.repository.organizationName}
                        organizationDisplayName={props.package.repository.organizationDisplayName}
                        deprecated={props.package.deprecated}
                        visibleLegend
                      />
                    )}

                  {!isNull(props.package.repository.userAlias) && (
                    <>
                      <span className="text-muted text-uppercase mr-1">User: </span>
                      <button
                        data-testid="userLink"
                        className={`p-0 border-0 text-truncate text-dark mw-100 ${styles.link}`}
                        onClick={(e) => {
                          e.preventDefault();
                          history.push({
                            pathname: '/packages/search',
                            search: prepareQueryString({
                              pageNumber: 1,
                              filters: {
                                user: [props.package.repository.userAlias!],
                              },
                            }),
                          });
                        }}
                      >
                        <div className="text-truncate">{props.package.repository.userAlias}</div>
                      </button>
                    </>
                  )}
                </div>
                <RepositoryInfo
                  repository={props.package.repository}
                  deprecated={props.package.deprecated}
                  className={`ml-3 d-flex flex-row align-items-baseline ${styles.mx50}`}
                />
              </div>
            </div>

            <div className={`d-none d-md-block card-subtitle text-truncate align-items-center ${styles.subtitle}`}>
              <div className="text-truncate mb-1">
                <span className="text-muted text-uppercase mr-1">Version: </span>
                {props.package.version || '-'}

                {(() => {
                  switch (props.package.repository.kind) {
                    case RepositoryKind.Helm:
                      return (
                        <>
                          <span className="text-muted text-uppercase mr-1 ml-3">App Version: </span>
                          {props.package.appVersion || '-'}
                        </>
                      );

                    default:
                      return null;
                  }
                })()}
              </div>
            </div>
          </div>

          <div
            className={`d-none d-${
              props.breakpointForInfoSection || 'md'
            }-flex flex-column align-items-end mb-auto ml-3`}
          >
            <div className="mb-2">{createdAt}</div>
            {starsAndKindInfo}
          </div>
        </div>
      </div>
      <div className={`mt-3 overflow-hidden ${styles.description} ${styles.lineClamp}`}>
        {props.package.description}
      </div>

      <div
        className={`d-flex d-${
          props.breakpointForInfoSection || 'md'
        }-none flex-row justify-content-between align-items-center mt-3 mt-${props.breakpointForInfoSection || 'md'}-0`}
      >
        {createdAt}
        {starsAndKindInfo}
      </div>

      <div className="d-inline d-lg-none mt-2 mt-sm-0">{badges}</div>
    </>
  );
};

export default PackageInfo;
