import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { API } from '../../../../../api';
import { NotificationKind, Package } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import buildPackageURL from '../../../../../utils/buildPackageURL';
import { SubscriptionItem, SUBSCRIPTIONS_LIST } from '../../../../../utils/data';
import prepareQueryString from '../../../../../utils/prepareQueryString';
import Image from '../../../../common/Image';
import Loading from '../../../../common/Loading';
import NoData from '../../../../common/NoData';
import PackageIcon from '../../../../common/PackageIcon';
import PackageCard from './PackageCard';
import styles from './SubscriptionsSection.module.css';

interface Props {
  onAuthError: () => void;
}

const SubscriptionsSection = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<Package[] | undefined>(undefined);
  const [apiError, setApiError] = useState<string | JSX.Element | null>(null);

  const getNotificationTitle = (kind: NotificationKind): string => {
    let title = '';
    const notif = SUBSCRIPTIONS_LIST.find((subs: SubscriptionItem) => subs.kind === kind);
    if (!isUndefined(notif)) {
      title = notif.title;
    }
    return title;
  };

  const updateOptimisticallyPackages = (kind: NotificationKind, isActive: boolean, packageId: string) => {
    const packageToUpdate = !isUndefined(packages)
      ? packages.find((item: Package) => item.packageId === packageId)
      : undefined;
    if (!isUndefined(packageToUpdate) && !isUndefined(packageToUpdate.notificationKinds)) {
      const newPackages = packages!.filter((item: Package) => item.packageId !== packageId);
      if (isActive) {
        packageToUpdate.notificationKinds = packageToUpdate.notificationKinds.filter(
          (notifKind: number) => notifKind !== kind
        );
      } else {
        packageToUpdate.notificationKinds.push(kind);
      }
      setPackages(newPackages);
    }
  };

  async function getSubscriptions() {
    try {
      setIsLoading(true);
      setPackages(await API.getUserSubscriptions());
      setApiError(null);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        setApiError('An error occurred getting your subscriptions, please try again later');
        setPackages([]);
      } else {
        props.onAuthError();
      }
    }
  }

  async function changeSubscription(packageId: string, kind: NotificationKind, isActive: boolean, packageName: string) {
    updateOptimisticallyPackages(kind, isActive, packageId);
    try {
      if (isActive) {
        await API.deleteSubscription(packageId, kind);
      } else {
        await API.addSubscription(packageId, kind);
      }
      getSubscriptions();
    } catch (err) {
      if (err.statusText !== 'ErrLoginRedirect') {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred ${isActive ? 'unsubscribing from' : 'subscribing to'} ${getNotificationTitle(
            kind
          )} notification for ${packageName} package, please try again later`,
        });
        getSubscriptions(); // Get subscriptions if changeSubscription fails
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    getSubscriptions();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className="d-flex flex-column flex-grow-1">
      {(isUndefined(packages) || isLoading) && <Loading />}

      <main role="main" className="container">
        <div className="flex-grow-1">
          <div className="h3 pb-2 border-bottom">
            <div>Your subscriptions</div>
          </div>

          <div className={`mx-auto mt-5 ${styles.wrapper}`}>
            <p className="m-0">
              You will receive an email notification when an event that matches any of the subscriptions in the list is
              fired. You can add more subscriptions from the packages' detail page, clicking on the bell icon on the top
              right corner.
            </p>

            {!isUndefined(packages) && (
              <div className="mt-5">
                {packages.length === 0 ? (
                  <NoData issuesLinkVisible={!isNull(apiError)}>
                    {isNull(apiError) ? <>You have not subscribed to any package yet</> : <>{apiError}</>}
                  </NoData>
                ) : (
                  <>
                    <div className="d-none d-sm-inline">
                      <table className={`table table-bordered table-hover ${styles.table}`}>
                        <thead>
                          <tr className={`table-primary ${styles.tableTitle}`}>
                            <th scope="col" className={`align-middle text-center ${styles.fitCell}`}>
                              Kind
                            </th>
                            <th scope="col" className="align-middle text-center w-50">
                              Package
                            </th>
                            <th scope="col" className="align-middle text-center w-50">
                              Publisher
                            </th>
                            {SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => (
                              <th
                                scope="col"
                                className={`align-middle text-nowrap ${styles.fitCell}`}
                                key={`title_${subs.kind}`}
                              >
                                <div className="d-flex flex-row align-items-center justify-content-center">
                                  {subs.icon}
                                  <span className="ml-2">{subs.title}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {packages.map((item: Package) => (
                            <tr key={`subs_${item.packageId}`} data-testid="subsTableCell">
                              <td className="align-middle text-center">
                                <PackageIcon kind={item.kind} className={styles.icon} />
                              </td>
                              <td className="align-middle">
                                <div className="d-flex flex-row align-items-center">
                                  <div
                                    className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}
                                  >
                                    <Image
                                      alt={item.displayName || item.name}
                                      imageId={item.logoImageId}
                                      className={styles.image}
                                    />
                                  </div>

                                  <Link
                                    data-testid="packageLink"
                                    className="ml-2 text-dark"
                                    to={{
                                      pathname: buildPackageURL(item),
                                    }}
                                  >
                                    {item.displayName || item.name}
                                  </Link>
                                </div>
                              </td>
                              <td className="align-middle position-relative">
                                {!isNull(item.userAlias) ? (
                                  <Link
                                    data-testid="userLink"
                                    className="text-dark"
                                    to={{
                                      pathname: '/packages/search',
                                      search: prepareQueryString({
                                        pageNumber: 1,
                                        filters: {
                                          user: [item.userAlias!],
                                        },
                                        deprecated: false,
                                      }),
                                    }}
                                  >
                                    {item.userAlias}
                                  </Link>
                                ) : (
                                  <Link
                                    data-testid="orgLink"
                                    className="text-dark"
                                    to={{
                                      pathname: '/packages/search',
                                      search: prepareQueryString({
                                        pageNumber: 1,
                                        filters: {
                                          org: [item.organizationName!],
                                        },
                                        deprecated: false,
                                      }),
                                    }}
                                  >
                                    {item.organizationDisplayName || item.organizationName}
                                  </Link>
                                )}

                                {!isNull(item.chartRepository) && !isUndefined(item.chartRepository) && (
                                  <small className="ml-2">
                                    (<span className={`text-uppercase text-muted ${styles.legend}`}>Repo: </span>
                                    <Link
                                      data-testid="repoLink"
                                      className="text-dark"
                                      to={{
                                        pathname: '/packages/search',
                                        search: prepareQueryString({
                                          pageNumber: 1,
                                          filters: {
                                            repo: [item.chartRepository!.name],
                                          },
                                          deprecated: false,
                                        }),
                                      }}
                                    >
                                      {item.chartRepository!.displayName || item.chartRepository!.name}
                                    </Link>
                                    )
                                  </small>
                                )}
                              </td>
                              {SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
                                const isActive =
                                  !isUndefined(item.notificationKinds) && item.notificationKinds.includes(subs.kind);
                                const id = `subs_${item.packageId}_${subs.kind}`;

                                return (
                                  <td
                                    className="align-middle text-center"
                                    key={`td_${item.normalizedName}_${subs.kind}`}
                                  >
                                    <div className="custom-control custom-switch">
                                      <input
                                        data-testid={`${item.name}_${subs.name}_input`}
                                        id={id}
                                        type="checkbox"
                                        className={`custom-control-input ${styles.checkbox}`}
                                        disabled={!subs.enabled}
                                        onChange={() =>
                                          changeSubscription(
                                            item.packageId,
                                            subs.kind,
                                            isActive,
                                            item.displayName || item.name
                                          )
                                        }
                                        checked={isActive}
                                      />
                                      <label
                                        data-testid={`${item.name}_${subs.name}_label`}
                                        className="custom-control-label"
                                        htmlFor={id}
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-inline d-sm-none">
                      {packages.map((item: Package) => (
                        <PackageCard key={item.packageId} package={item} changeSubscription={changeSubscription} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubscriptionsSection;
