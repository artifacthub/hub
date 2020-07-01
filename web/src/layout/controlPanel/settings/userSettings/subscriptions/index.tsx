import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';
import { Link } from 'react-router-dom';

import { API } from '../../../../../api';
import { ErrorKind, EventKind, Package } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import buildPackageURL from '../../../../../utils/buildPackageURL';
import { SubscriptionItem, SUBSCRIPTIONS_LIST } from '../../../../../utils/data';
import prepareQueryString from '../../../../../utils/prepareQueryString';
import Image from '../../../../common/Image';
import Loading from '../../../../common/Loading';
import NoData from '../../../../common/NoData';
import RepositoryIcon from '../../../../common/RepositoryIcon';
import SubscriptionModal from './Modal';
import PackageCard from './PackageCard';
import styles from './SubscriptionsSection.module.css';

interface Props {
  onAuthError: () => void;
}

const SubscriptionsSection = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<Package[] | undefined>(undefined);
  const [apiError, setApiError] = useState<string | JSX.Element | null>(null);
  const [modalStatus, setModalStatus] = useState<boolean>(false);

  const getNotificationTitle = (kind: EventKind): string => {
    let title = '';
    const notif = SUBSCRIPTIONS_LIST.find((subs: SubscriptionItem) => subs.kind === kind);
    if (!isUndefined(notif)) {
      title = notif.title;
    }
    return title;
  };

  const updateOptimisticallyPackages = (kind: EventKind, isActive: boolean, packageId: string) => {
    const packageToUpdate = !isUndefined(packages)
      ? packages.find((item: Package) => item.packageId === packageId)
      : undefined;
    if (!isUndefined(packageToUpdate) && !isUndefined(packageToUpdate.eventKinds)) {
      const newPackages = packages!.filter((item: Package) => item.packageId !== packageId);
      if (isActive) {
        packageToUpdate.eventKinds = packageToUpdate.eventKinds.filter((notifKind: number) => notifKind !== kind);
      } else {
        packageToUpdate.eventKinds.push(kind);
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
      if (err.kind !== ErrorKind.Unauthorized) {
        setApiError('An error occurred getting your subscriptions, please try again later.');
        setPackages([]);
      } else {
        props.onAuthError();
      }
    }
  }

  async function changeSubscription(packageId: string, kind: EventKind, isActive: boolean, packageName: string) {
    updateOptimisticallyPackages(kind, isActive, packageId);

    try {
      if (isActive) {
        await API.deleteSubscription(packageId, kind);
      } else {
        await API.addSubscription(packageId, kind);
      }
      getSubscriptions();
    } catch (err) {
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred ${isActive ? 'unsubscribing from' : 'subscribing to'} ${getNotificationTitle(
            kind
          )} notification for ${packageName} package, please try again later.`,
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

      <main role="main" className="container p-0">
        <div className="flex-grow-1">
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom">
            <div className={`h3 pb-0 ${styles.title}`}>Your subscriptions</div>
            <div>
              <button
                data-testid="addSubscriptionsBtn"
                className={`btn btn-secondary btn-sm text-uppercase ${styles.btnAction}`}
                onClick={() => setModalStatus(true)}
              >
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline mr-2" />
                  <span className="d-none d-md-inline">Add</span>
                </div>
              </button>
            </div>
          </div>

          <div className={`mx-auto mt-4 mt-md-5 ${styles.wrapper}`}>
            <p className="m-0">
              You will receive an email notification when an event that matches any of the subscriptions in the list is
              fired.
            </p>

            {!isUndefined(packages) && (
              <div className="mt-4 mt-md-5">
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
                            <th
                              scope="col"
                              className={`align-middle text-center d-none d-sm-table-cell ${styles.fitCell}`}
                            >
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
                                  <span className="d-none d-lg-inline ml-2">{subs.title}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {packages.map((item: Package) => (
                            <tr key={`subs_${item.packageId}`} data-testid="subsTableCell">
                              <td className="align-middle text-center d-none d-sm-table-cell">
                                <RepositoryIcon kind={item.repository.kind} className={styles.icon} />
                              </td>
                              <td className="align-middle">
                                <div className="d-flex flex-row align-items-center">
                                  <div
                                    className={`d-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper}`}
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
                                {!isNull(item.repository.userAlias) ? (
                                  <Link
                                    data-testid="userLink"
                                    className="text-dark"
                                    to={{
                                      pathname: '/packages/search',
                                      search: prepareQueryString({
                                        pageNumber: 1,
                                        filters: {
                                          user: [item.repository.userAlias!],
                                        },
                                      }),
                                    }}
                                  >
                                    {item.repository.userAlias}
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
                                          org: [item.repository.organizationName!],
                                        },
                                      }),
                                    }}
                                  >
                                    {item.repository.organizationDisplayName || item.repository.organizationName}
                                  </Link>
                                )}

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
                                          repo: [item.repository.name],
                                        },
                                      }),
                                    }}
                                  >
                                    {item.repository.displayName || item.repository.name}
                                  </Link>
                                  )
                                </small>
                              </td>
                              {SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
                                const isActive = !isUndefined(item.eventKinds) && item.eventKinds.includes(subs.kind);
                                const id = `subs_${item.packageId}_${subs.kind}`;

                                return (
                                  <td
                                    className="align-middle text-center"
                                    key={`td_${item.normalizedName}_${subs.kind}`}
                                  >
                                    <div className="custom-control custom-switch ml-2">
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

          <SubscriptionModal
            open={modalStatus}
            subscriptions={packages}
            onSuccess={getSubscriptions}
            onClose={() => setModalStatus(false)}
          />
        </div>
      </main>
    </div>
  );
};

export default SubscriptionsSection;
