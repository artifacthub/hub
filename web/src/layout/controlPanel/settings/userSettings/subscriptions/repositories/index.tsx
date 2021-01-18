import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { IoMdLogOut } from 'react-icons/io';
import { MdBusiness } from 'react-icons/md';
import { Link } from 'react-router-dom';

import { API } from '../../../../../../api';
import { ErrorKind, EventKind, OptOutItem } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import { REPOSITORY_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../../../../../utils/data';
import prepareQueryString from '../../../../../../utils/prepareQueryString';
import Loading from '../../../../../common/Loading';
import RepositoryIcon from '../../../../../common/RepositoryIcon';
import styles from '../SubscriptionsSection.module.css';
import OptOutModal from './Modal';

interface Props {
  onAuthError: () => void;
}

const RepositoriesSection = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [optOutList, setOptOutList] = useState<OptOutItem[] | undefined>(undefined);
  const [modalStatus, setModalStatus] = useState<boolean>(false);

  const getNotificationTitle = useCallback((kind: EventKind): string => {
    let title = '';
    const notif = REPOSITORY_SUBSCRIPTIONS_LIST.find((subs: SubscriptionItem) => subs.kind === kind);
    if (!isUndefined(notif)) {
      title = notif.title.toLowerCase();
    }
    return title;
  }, []);

  const updateModalStatus = useCallback((status: boolean) => {
    setModalStatus(status);
  }, []);

  async function fetchOptOutList() {
    try {
      setIsLoading(true);
      setOptOutList(await API.getOptOutList());
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting your opt-out entries list, please try again later.',
        });
        setOptOutList([]);
      } else {
        props.onAuthError();
      }
    }
  }

  const getOptOutList = useCallback(() => {
    fetchOptOutList();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  const deleteOptoutEntryOptimistically = (repoId: string) => {
    const repoToUpdate = !isUndefined(optOutList)
      ? optOutList.find((item: OptOutItem) => item.repository.repositoryId! === repoId)
      : undefined;
    if (!isUndefined(repoToUpdate)) {
      const newOptOutList = optOutList!.filter((item: OptOutItem) => item.repository.repositoryId! !== repoId);
      setOptOutList(newOptOutList);
    }
  };

  async function changeSubscription(
    repoId: string,
    kind: EventKind,
    isActive: boolean,
    repoName: string,
    optOutId?: string
  ) {
    if (isActive) {
      deleteOptoutEntryOptimistically(repoId);
    }

    try {
      if (isActive && !isUndefined(optOutId)) {
        await API.deleteOptOut(optOutId);
      } else {
        await API.addOptOut(repoId, kind);
      }
      fetchOptOutList();
    } catch (err) {
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred ${isActive ? 'deleting' : 'adding'} the opt-out entry for ${getNotificationTitle(
            kind
          )} notifications for repository ${repoName}, please try again later.`,
        });
        fetchOptOutList(); // Get opt-out if changeSubscription fails
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchOptOutList();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className="mt-5 pt-3">
      {(isUndefined(optOutList) || isLoading) && <Loading />}
      <div className="d-flex flex-row align-items-start justify-content-between pb-2">
        <div className={`h4 pb-0 ${styles.title}`}>Repositories</div>
        <div>
          <button
            data-testid="addOptOut"
            className={`btn btn-secondary btn-sm text-uppercase ${styles.btnAction}`}
            onClick={() => updateModalStatus(true)}
          >
            <div className="d-flex flex-row align-items-center justify-content-center">
              <IoMdLogOut />
              <span className="d-none d-md-inline ml-2">Opt-out</span>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-3 mt-md-3">
        <p>
          Repositories notifications are <span className="font-weight-bold">enabled by default</span>. However, you can
          opt-out of notifications for certain kinds of events that happen in any of the repositories you can manage.
        </p>

        <p>
          You will <span className="font-weight-bold">NOT</span> receive notifications when an event that matches any of
          the repositories in the list is fired.
        </p>

        <div className="mt-4 mt-md-5">
          {!isUndefined(optOutList) && optOutList.length > 0 && (
            <div className="row">
              <div className="col-12 col-xxl-10">
                <table className={`table table-bordered table-hover ${styles.table}`} data-testid="repositoriesList">
                  <thead>
                    <tr className={`table-primary ${styles.tableTitle}`}>
                      <th scope="col" className={`align-middle text-center d-none d-sm-table-cell ${styles.fitCell}`}>
                        Kind
                      </th>
                      <th scope="col" className="align-middle w-50">
                        Repository
                      </th>
                      <th scope="col" className="align-middle w-50 d-none d-sm-table-cell">
                        Publisher
                      </th>
                      {REPOSITORY_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => (
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
                    {optOutList.map((item: OptOutItem) => (
                      <tr key={`subs_${item.optOutId}`} data-testid="optOutRow">
                        <td className="align-middle text-center d-none d-sm-table-cell">
                          <RepositoryIcon kind={item.repository.kind} className={styles.icon} />
                        </td>
                        <td className="align-middle">
                          <div className="d-flex flex-row align-items-center">
                            <Link
                              data-testid="repoLink"
                              className="text-dark text-capitalize"
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
                              {item.repository.name}
                            </Link>
                          </div>
                        </td>
                        <td className="align-middle position-relative d-none d-sm-table-cell">
                          <span className={`mx-1 mb-1 ${styles.tinyIcon}`}>
                            {item.repository.userAlias ? <FaUser /> : <MdBusiness />}
                          </span>{' '}
                          {item.repository.userAlias ? (
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
                        </td>
                        {REPOSITORY_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
                          const isActive = subs.kind === item.eventKind;
                          const id = `subs_${item.repository.repositoryId!}_${subs.kind}`;

                          return (
                            <td className="align-middle text-center" key={`td_${item.repository.name}_${subs.kind}`}>
                              <div className="custom-control custom-switch ml-2">
                                <input
                                  data-testid={`${item.optOutId}_${subs.name}_input`}
                                  id={id}
                                  type="checkbox"
                                  className={`custom-control-input ${styles.checkbox}`}
                                  disabled={!subs.enabled}
                                  onChange={() =>
                                    changeSubscription(
                                      item.repository.repositoryId!,
                                      subs.kind,
                                      isActive,
                                      item.repository.name,
                                      item.optOutId
                                    )
                                  }
                                  checked={isActive}
                                />
                                <label
                                  data-testid={`${item.optOutId}_${subs.name}_label`}
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
            </div>
          )}
        </div>
      </div>

      {modalStatus && (
        <OptOutModal
          optOutList={optOutList}
          onSuccess={getOptOutList}
          onClose={() => updateModalStatus(false)}
          onAuthError={props.onAuthError}
          getNotificationTitle={getNotificationTitle}
          open
        />
      )}
    </div>
  );
};

export default React.memo(RepositoriesSection);
