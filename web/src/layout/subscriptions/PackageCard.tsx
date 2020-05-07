import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaCheck } from 'react-icons/fa';
import { Link, useHistory } from 'react-router-dom';

import { NotificationKind, Package, PackageKind } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import { SubscriptionItem, SUBSCRIPTIONS_LIST } from '../../utils/data';
import prepareQueryString from '../../utils/prepareQueryString';
import Image from '../common/Image';
import OrganizationInfo from '../common/OrganizationInfo';
import PackageIcon from '../common/PackageIcon';
import styles from './PackageCard.module.css';

interface Props {
  package: Package;
  changeSubscription: (packageId: string, kind: NotificationKind, isActive: boolean, packageName: string) => void;
}

const PackageCard = (props: Props) => {
  const history = useHistory();
  return (
    <div className="col-12 py-sm-3 py-2" role="listitem">
      <div className={`card h-100 ${styles.card}`}>
        <Link
          data-testid="packageLink"
          className={`text-decoration-none ${styles.link}`}
          to={{
            pathname: buildPackageURL(props.package),
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
                                <span className="text-muted text-uppercase mr-1">Repo:</span>
                                <button
                                  data-testid="repoLink"
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
                            </>
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

            {SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
              const isActive =
                !isUndefined(props.package.notificationKinds) && props.package.notificationKinds.includes(subs.kind);

              return (
                <button
                  data-testid={`${subs.name}MobileBtn`}
                  key={`card_${props.package.normalizedName}_${subs.kind}`}
                  className="btn btn-primary btn-sm"
                  disabled={!subs.enabled}
                  onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                    e.preventDefault();
                    e.stopPropagation();

                    props.changeSubscription(
                      props.package.packageId,
                      subs.kind,
                      isActive,
                      props.package.displayName || props.package.name
                    );
                  }}
                >
                  <div className="d-flex flex-row align-items-center">
                    {subs.icon} <span className="ml-1">{subs.title}</span>
                    <span className={`m-0 p-0 ml-3 badge badge-pill badge-light ${styles.badge}`}>
                      <small className="text-success">{isActive && <FaCheck />}</small>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Link>
      </div>
    </div>
  );
};

export default PackageCard;
