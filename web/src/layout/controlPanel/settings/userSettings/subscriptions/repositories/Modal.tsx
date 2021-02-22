import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { IoMdLogOut } from 'react-icons/io';
import { MdBusiness, MdClose } from 'react-icons/md';

import { API } from '../../../../../../api';
import { AppCtx } from '../../../../../../context/AppCtx';
import { ErrorKind, EventKind, OptOutItem, Organization, Repository } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import { REPOSITORY_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../../../../../utils/data';
import Modal from '../../../../../common/Modal';
import RepositoryIcon from '../../../../../common/RepositoryIcon';
import SearchTypeaheadRepository from '../../../../../common/SearchTypeaheadRepository';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  optOutList?: OptOutItem[];
  onSuccess: () => void;
  onClose: () => void;
  onAuthError: () => void;
  getNotificationTitle: (kind: EventKind) => string;
}

const OptOutModal = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [apiError, setApiError] = useState<string | null>(null);
  const [repoItem, setRepoItem] = useState<Repository | null>(null);
  const [eventKind, setEventKind] = useState<EventKind>(EventKind.RepositoryTrackingErrors);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [repositories, setRepositories] = useState<Repository[] | undefined>(undefined);

  const onCloseModal = () => {
    setRepoItem(null);
    props.onClose();
  };

  const submitForm = () => {
    if (!isNull(repoItem)) {
      addOptOut();
    }
  };

  const onRepoSelect = (repo: Repository): void => {
    setRepoItem(repo);
  };

  const getSubscribedReposIds = (): string[] => {
    if (isUndefined(props.optOutList)) return [];

    const selectedRepos = props.optOutList.filter((item: OptOutItem) => item.eventKind === eventKind);
    return selectedRepos.map((item: OptOutItem) => item.repository.repositoryId!);
  };

  async function getRepositories() {
    try {
      setIsLoading(true);
      const orgs = await API.getUserOrganizations();
      const repositories = await Promise.all([
        API.getRepositories(),
        ...orgs.map((org: Organization) => API.getRepositories(org.name)),
      ]);

      const formattedRepos: Repository[] = [];
      repositories.forEach((repoList: Repository[], index: number) => {
        if (index === 0) {
          repoList.forEach((repo: Repository) => {
            formattedRepos.push({
              ...repo,
              userAlias: ctx.user!.alias,
            });
          });
        } else {
          repoList.forEach((repo: Repository) => {
            formattedRepos.push({
              ...repo,
              organizationDisplayName: orgs[index - 1].displayName,
              organizationName: orgs[index - 1].name,
            });
          });
        }
      });
      setRepositories(formattedRepos);

      setApiError(null);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setApiError('An error occurred getting your repositories, please try again later.');
        setRepositories([]);
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    getRepositories();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  async function addOptOut() {
    try {
      setIsSending(true);
      await API.addOptOut(repoItem!.repositoryId!, eventKind);
      setRepoItem(null);
      setIsSending(false);
      props.onSuccess();
      props.onClose();
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred adding the opt-out entry for ${props.getNotificationTitle(
            eventKind
          )} notifications for repository ${repoItem!.displayName || repoItem!.name}, please try again later.`,
        });
      }
    }
  }

  return (
    <Modal
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Add opt-out entry</div>}
      open={props.open}
      modalDialogClassName={styles.modal}
      closeButton={
        <button
          data-testid="addOptOutModalBtn"
          className="btn btn-sm btn-secondary"
          type="button"
          disabled={isNull(repoItem) || isSending}
          onClick={submitForm}
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2">Opting out</span>
            </>
          ) : (
            <div className="d-flex flex-row align-items-center text-uppercase">
              <IoMdLogOut className="mr-2" />
              <div>Opt-out</div>
            </div>
          )}
        </button>
      }
      onClose={onCloseModal}
      error={apiError}
      cleanError={() => setApiError(null)}
      noScrollable
    >
      <div className="w-100 position-relative">
        <label className={`font-weight-bold ${styles.label}`} htmlFor="kind">
          Events
        </label>
        <div className="d-flex flex-row flex-wrap mb-3">
          {REPOSITORY_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
            return (
              <div className="mr-4" key={`radio_${subs.name}`}>
                <div className="custom-control custom-radio text-nowrap my-1 my-md-0">
                  <input
                    data-testid={`radio_${subs.kind}`}
                    className="custom-control-input"
                    type="radio"
                    name="kind"
                    id={subs.name}
                    value={subs.kind}
                    disabled={!subs.enabled}
                    checked={subs.kind === eventKind}
                    onChange={() => setEventKind(subs.kind)}
                    required
                  />
                  <label className="custom-control-label" htmlFor={subs.name}>
                    <div className="d-flex flex-row align-items-center ml-2">
                      {subs.icon}
                      <div className="ml-1">{subs.title}</div>
                    </div>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="d-flex flex-column mb-3">
          <label className={`font-weight-bold ${styles.label}`} htmlFor="description">
            Repository
          </label>

          <small className="mb-2">Select repository:</small>

          {!isNull(repoItem) ? (
            <div
              data-testid="activeRepoItem"
              className={`border border-secondary w-100 rounded mt-1 ${styles.repoWrapper}`}
            >
              <div className="d-flex flex-row flex-nowrap align-items-stretch justify-content-between">
                <div className="flex-grow-1 text-truncate py-2">
                  <div className="d-flex flex-row align-items-center h-100 text-truncate">
                    <div className="d-none d-md-inline">
                      <RepositoryIcon kind={repoItem.kind} className={`mx-3 ${styles.icon}`} />
                    </div>

                    <div className="ml-2 font-weight-bold mb-0 text-truncate text-capitalize">{repoItem.name}</div>

                    <div className="px-2 ml-auto w-50 text-dark text-truncate">
                      <small className="d-flex flex-row align-items-baseline ml-2">
                        (
                        <small className={`d-none d-md-inline text-uppercase text-muted mr-1 ${styles.legend}`}>
                          Publisher:{' '}
                        </small>
                        <div className={`mr-1 ${styles.tinyIcon}`}>
                          {repoItem.userAlias ? <FaUser /> : <MdBusiness />}
                        </div>
                        <span>
                          {repoItem.userAlias || repoItem.organizationDisplayName || repoItem.organizationName})
                        </span>
                      </small>
                    </div>
                  </div>
                </div>

                <div>
                  <button className={`btn h-100 rounded-0 ${styles.closeButton}`} onClick={() => setRepoItem(null)}>
                    <MdClose />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`mt-2 ${styles.searchWrapper}`}>
              <SearchTypeaheadRepository
                repositories={repositories || []}
                disabledList={getSubscribedReposIds()}
                isLoading={isLoading}
                onSelect={onRepoSelect}
                placeholder="There aren't any repositories you can manage at the moment."
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OptOutModal;
