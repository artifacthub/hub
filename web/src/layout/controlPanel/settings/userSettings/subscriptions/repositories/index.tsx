import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { useEffect, useRef, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { IoMdLogOut } from 'react-icons/io';
import { MdBusiness } from 'react-icons/md';
import { Link } from 'react-router-dom';

import API from '../../../../../../api';
import { ErrorKind, EventKind, OptOutItem, Repository } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import { REPOSITORY_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../../../../../utils/data';
import { prepareQueryString } from '../../../../../../utils/prepareQueryString';
import Loading from '../../../../../common/Loading';
import Pagination from '../../../../../common/Pagination';
import RepositoryIcon from '../../../../../common/RepositoryIcon';
import styles from '../SubscriptionsSection.module.css';
import OptOutModal from './Modal';
import SubscriptionSwitch from './SubscriptionSwitch';

interface Props {
  onAuthError: () => void;
}

const DEFAULT_LIMIT = 10;

interface ChangeSubsProps {
  data: {
    repoId: string;
    kind: EventKind;
    repoName: string;
    optOutId?: string;
  };
  callback: () => void;
}

interface OptOutByRepo {
  repository: Repository;
  optOutItems: OptOutItem[];
}

const RepositoriesSection = (props: Props) => {
  const title = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [optOutList, setOptOutList] = useState<OptOutByRepo[] | undefined>(undefined);
  const [optOutFullList, setOptOutFullList] = useState<OptOutByRepo[] | undefined>(undefined);
  const [repoIdsList, setRepoIdsList] = useState<string[]>([]);
  const [optOutItems, setOptOutItems] = useState<OptOutItem[] | undefined>(undefined);
  const [modalStatus, setModalStatus] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<number>(1);

  const calculateOffset = (pageNumber?: number): number => {
    return DEFAULT_LIMIT * ((pageNumber || activePage) - 1);
  };

  const [offset, setOffset] = useState<number>(calculateOffset());
  const [total, setTotal] = useState<number | undefined>(undefined);

  const onPageNumberChange = (pageNumber: number): void => {
    setOffset(calculateOffset(pageNumber));
    setActivePage(pageNumber);
    if (title && title.current) {
      title.current.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
    }
  };

  const getNotificationTitle = (kind: EventKind): string => {
    let title = '';
    const notif = REPOSITORY_SUBSCRIPTIONS_LIST.find((subs: SubscriptionItem) => subs.kind === kind);
    if (!isUndefined(notif)) {
      title = notif.title.toLowerCase();
    }
    return title;
  };

  const getVisibleOptOut = (items: OptOutByRepo[]): OptOutByRepo[] => {
    if (isUndefined(items)) return [];
    return items.slice(offset, offset + DEFAULT_LIMIT);
  };

  const sortOptOutList = (items: OptOutItem[]): OptOutByRepo[] => {
    const list: OptOutByRepo[] = [];

    items.forEach((item: OptOutItem) => {
      const itemIndex = list.findIndex(
        (obr: OptOutByRepo) => obr.repository.repositoryId === item.repository.repositoryId
      );
      if (itemIndex >= 0) {
        list[itemIndex] = { ...list[itemIndex], optOutItems: [...list[itemIndex].optOutItems, item] };
      } else {
        list.push({
          repository: item.repository,
          optOutItems: [item],
        });
      }
    });

    return sortBy(list, 'repository.name') as OptOutByRepo[];
  };

  async function getOptOutList(callback?: () => void) {
    try {
      setIsLoading(true);
      const items = await API.getAllOptOut();
      const formattedItems = sortOptOutList(items);
      setOptOutItems(items);
      setOptOutFullList(formattedItems);
      setRepoIdsList(formattedItems ? formattedItems.map((item: OptOutByRepo) => item.repository.repositoryId!) : []);
      setTotal(formattedItems.length);
      const newVisibleItems = getVisibleOptOut(formattedItems);
      // When current page is empty after changes
      if (newVisibleItems.length === 0 && activePage !== 1) {
        onPageNumberChange(1);
      } else {
        setOptOutList(newVisibleItems);
      }
      setIsLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting your opt-out entries list, please try again later.',
        });
        setOptOutFullList([]);
        setOptOutList([]);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
  }, []);

  useEffect(() => {
    setOptOutList(getVisibleOptOut(optOutFullList || []));
  }, [activePage]);

  return (
    <div className="mt-5 pt-3">
      {(isUndefined(optOutList) || isLoading) && <Loading />}
      <div className="d-flex flex-row align-items-start justify-content-between pb-2">
        <div ref={title} className={`h4 pb-0 ${styles.title}`}>
          Repositories
        </div>
        <div>
          <button
            className={`btn btn-outline-secondary btn-sm text-uppercase ${styles.btnAction}`}
            onClick={() => setModalStatus(true)}
            aria-label="Open opt-out modal"
          >
            <div className="d-flex flex-row align-items-center justify-content-center">
              <IoMdLogOut />
              <span className="d-none d-md-inline ms-2">Opt-out</span>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-3 mt-md-3">
        <p>
          Repositories notifications are <span className="fw-bold">enabled by default</span>. However, you can opt-out
          of notifications for certain kinds of events that happen in any of the repositories you can manage.
        </p>

        <p>
          You will <span className="fw-bold">NOT</span> receive notifications when an event that matches any of the
          repositories in the list is fired.
        </p>

        <div className="mt-4 mt-md-5">
          {!isUndefined(optOutList) && optOutList.length > 0 && (
            <div className="row">
              <div className="col-12 col-xxxl-10">
                <table className={`table table-bordered table-hover ${styles.table}`} data-testid="repositoriesList">
                  <thead>
                    <tr className={styles.tableTitle}>
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
                            {subs.shortTitle && <span className="d-inline d-lg-none ms-2">{subs.shortTitle}</span>}
                            <span className="d-none d-lg-inline ms-2">{subs.title}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={styles.body}>
                    {optOutList.map((item: OptOutByRepo) => {
                      const repoInfo: Repository = item.repository;
                      return (
                        <tr key={`subs_${repoInfo.repositoryId}`} data-testid="optOutRow">
                          <td className="align-middle text-center d-none d-sm-table-cell">
                            <RepositoryIcon kind={repoInfo.kind} className={`h-auto ${styles.icon}`} />
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
                          {REPOSITORY_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
                            const optItem = item.optOutItems.find((opt: OptOutItem) => subs.kind === opt.eventKind);

                            return (
                              <td className="align-middle text-center" key={`td_${repoInfo.name}_${subs.kind}`}>
                                <div className="text-center position-relative">
                                  <SubscriptionSwitch
                                    repoInfo={repoInfo}
                                    kind={subs.kind}
                                    enabled={subs.enabled}
                                    optOutItem={optItem}
                                    changeSubscription={changeSubscription}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {!isUndefined(total) && total > DEFAULT_LIMIT && (
                      <tr className={styles.paginationCell}>
                        <td className="align-middle text-center" colSpan={5}>
                          <Pagination
                            limit={DEFAULT_LIMIT}
                            offset={offset}
                            total={total}
                            active={activePage}
                            className="my-3"
                            onChange={onPageNumberChange}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalStatus && (
        <OptOutModal
          disabledList={repoIdsList}
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
