import { groupBy, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { IoMdLogOut } from 'react-icons/io';
import { MdBusiness } from 'react-icons/md';
import { Link } from 'react-router-dom';

import { API } from '../../../../../../api';
import { ErrorKind, EventKind, OptOutItem, Repository } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import { REPOSITORY_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../../../../../utils/data';
import prepareQueryString from '../../../../../../utils/prepareQueryString';
import Loading from '../../../../../common/Loading';
import RepositoryIcon from '../../../../../common/RepositoryIcon';
import styles from '../SubscriptionsSection.module.css';
import OptOutModal from './Modal';
import SubscriptionSwitch from './SubscriptionSwitch';

interface Props {
  onAuthError: () => void;
}

interface OptOutItemList {
  [key: string]: OptOutItem[];
}

interface ChangeSubsProps {
  data: {
    repoId: string;
    kind: EventKind;
    repoName: string;
    optOutId?: string;
  };
  callback: () => void;
}

const RepositoriesSection = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [optOutList, setOptOutList] = useState<OptOutItemList | undefined>(undefined);
  const [optOutItems, setOptOutItems] = useState<OptOutItem[] | undefined>(undefined);
  const [modalStatus, setModalStatus] = useState<boolean>(false);

  const getNotificationTitle = (kind: EventKind): string => {
    let title = '';
    const notif = REPOSITORY_SUBSCRIPTIONS_LIST.find((subs: SubscriptionItem) => subs.kind === kind);
    if (!isUndefined(notif)) {
      title = notif.title.toLowerCase();
    }
    return title;
  };

  async function getOptOutList(callback?: () => void) {
    try {
      setIsLoading(true);
      const optOutRawList = await API.getOptOutList();
      setOptOutItems(optOutRawList);
      setOptOutList(groupBy(optOutRawList, (item: OptOutItem) => item.repository.repositoryId));
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting your opt-out entries list, please try again later.',
        });
        setOptOutList({});
      } else {
        props.onAuthError();
      }
    } finally {
      if (callback) {
        callback();
      }
    }
  }

  async function changeSubscription(changeProps: ChangeSubsProps) {
    const { data, callback } = { ...changeProps };
    try {
      if (!isUndefined(data.optOutId)) {
        await API.deleteOptOut(data.optOutId);
      } else {
        await API.addOptOut(data.repoId, data.kind);
      }
      getOptOutList(callback);
    } catch (err) {
      callback();
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred ${
            !isUndefined(data.optOutId) ? 'deleting' : 'adding'
          } the opt-out entry for ${getNotificationTitle(data.kind)} notifications for repository ${
            data.repoName
          }, please try again later.`,
        });
        getOptOutList(); // Get opt-out if changeSubscription fails
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    getOptOutList();
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
            onClick={() => setModalStatus(true)}
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
          {!isUndefined(optOutList) && Object.keys(optOutList).length > 0 && (
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
                            {subs.shortTitle && <span className="d-inline d-lg-none ml-2">{subs.shortTitle}</span>}
                            <span className="d-none d-lg-inline ml-2">{subs.title}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(optOutList).map((repoId: string) => {
                      const repoInfo: Repository = optOutList[repoId][0].repository;
                      return (
                        <tr key={`subs_${repoId}`} data-testid="optOutRow">
                          <td className="align-middle text-center d-none d-sm-table-cell">
                            <RepositoryIcon kind={repoInfo.kind} className={styles.icon} />
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
                                      repo: [repoInfo.name],
                                    },
                                  }),
                                }}
                              >
                                {repoInfo.name}
                              </Link>
                            </div>
                          </td>
                          <td className="align-middle position-relative d-none d-sm-table-cell">
                            <span className={`mx-1 mb-1 ${styles.tinyIcon}`}>
                              {repoInfo.userAlias ? <FaUser /> : <MdBusiness />}
                            </span>{' '}
                            {repoInfo.userAlias ? (
                              <Link
                                data-testid="userLink"
                                className="text-dark"
                                to={{
                                  pathname: '/packages/search',
                                  search: prepareQueryString({
                                    pageNumber: 1,
                                    filters: {
                                      user: [repoInfo.userAlias!],
                                    },
                                  }),
                                }}
                              >
                                {repoInfo.userAlias}
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
                                      org: [repoInfo.organizationName!],
                                    },
                                  }),
                                }}
                              >
                                {repoInfo.organizationDisplayName || repoInfo.organizationName}
                              </Link>
                            )}
                          </td>
                          {REPOSITORY_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem, index: number) => {
                            const optItem = optOutList[repoId].find((opt: OptOutItem) => subs.kind === opt.eventKind);

                            return (
                              <td className="align-middle text-center" key={`td_${repoInfo.name}_${subs.kind}`}>
                                <SubscriptionSwitch
                                  repoInfo={repoInfo}
                                  kind={subs.kind}
                                  enabled={subs.enabled}
                                  optOutItem={optItem}
                                  changeSubscription={changeSubscription}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalStatus && (
        <OptOutModal
          optOutList={optOutItems}
          onSuccess={getOptOutList}
          onClose={() => setModalStatus(false)}
          onAuthError={props.onAuthError}
          getNotificationTitle={getNotificationTitle}
          open
        />
      )}
    </div>
  );
};

export default RepositoriesSection;
