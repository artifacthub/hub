import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { IoMdLogOut } from 'react-icons/io';
import { MdBusiness, MdClose } from 'react-icons/md';

import API from '../../../../../../api';
import { AppCtx } from '../../../../../../context/AppCtx';
import { ErrorKind, EventKind, OptOutItem, Organization, Repository } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import { REPOSITORY_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../../../../../utils/data';
import Modal from '../../../../../common/Modal';
import RepositoryIcon from '../../../../../common/RepositoryIcon';
import SearchRepositories from '../../../../../common/SearchRepositories';
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
  const [userOrganizations, setUserOrganizations] = useState<string[] | undefined>(undefined);

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

  async function getAllUserOrganizations() {
    try {
      const orgs = await API.getAllUserOrganizations();
      const orgsList = orgs.map((org: Organization) => org.name);
      setUserOrganizations(orgsList);
    } catch (err: any) {
      setUserOrganizations([]);
    }
  }

  useEffect(() => {
    getAllUserOrganizations();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  async function addOptOut() {
    try {
      setIsSending(true);
      await API.addOptOut(repoItem!.repositoryId!, eventKind);
      setRepoItem(null);
      setIsSending(false);
      props.onSuccess();
      props.onClose();
    } catch (err: any) {
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

  const getPublisher = (repo: Repository) => (
    <small className="ml-0 ml-sm-2">
      <span className="d-none d-sm-inline">(</span>
      <small className="d-none d-md-inline text-muted mr-1 text-uppercase">Publisher: </small>
      <div className={`d-inline mr-1 ${styles.tinyIcon}`}>{repo.userAlias ? <FaUser /> : <MdBusiness />}</div>
      <span>{repo.userAlias || repo.organizationDisplayName || repo.organizationName}</span>
      <span className="d-none d-sm-inline">)</span>
    </small>
  );

  return (
    <Modal
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Add opt-out entry</div>}
      open={props.open}
      modalDialogClassName={styles.modal}
      closeButton={
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          disabled={isNull(repoItem) || isSending}
          onClick={submitForm}
          aria-label="Add opt-out entry"
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
        <div className="d-flex flex-column flex-wrap pb-2">
          {REPOSITORY_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
            return (
              <div className="mb-2" key={`radio_${subs.name}`}>
                <div className="custom-control custom-radio text-nowrap my-1 my-md-0">
                  <input
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

                    <div className="ml-2 mr-2 mr-sm-0 font-weight-bold mb-0 text-truncate">
                      {repoItem.name}
                      <span className="d-inline d-sm-none">
                        <span className="mx-2">/</span>
                        {getPublisher(repoItem)}
                      </span>
                    </div>

                    <div className="px-2 ml-auto w-50 text-dark text-truncate d-none d-sm-inline">
                      {getPublisher(repoItem)}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    className={`btn h-100 rounded-0 ${styles.closeButton}`}
                    onClick={() => setRepoItem(null)}
                    aria-label="Close"
                  >
                    <MdClose />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`mt-2 ${styles.searchWrapper}`}>
              <SearchRepositories
                label="repo-subscriptions"
                disabledRepositories={{
                  ids: getSubscribedReposIds(),
                }}
                extraQueryParams={{ user: ctx.user ? [ctx.user.alias] : [], org: userOrganizations || [] }}
                onSelection={onRepoSelect}
                onAuthError={props.onAuthError}
                visibleUrl={false}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OptOutModal;
