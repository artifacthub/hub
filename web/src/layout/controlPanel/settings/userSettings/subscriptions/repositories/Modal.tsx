import isNull from 'lodash/isNull';
import { useContext, useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { IoMdLogOut } from 'react-icons/io';
import { MdBusiness } from 'react-icons/md';

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
  disabledList: string[];
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

  async function getAllUserOrganizations() {
    try {
      const orgs = await API.getAllUserOrganizations();
      const orgsList = orgs.map((org: Organization) => org.name);
      setUserOrganizations(orgsList);
    } catch {
      setUserOrganizations([]);
    }
  }

  useEffect(() => {
    getAllUserOrganizations();
  }, []);

  async function addOptOut() {
    try {
      setIsSending(true);
      await API.addOptOut(repoItem!.repositoryId!, eventKind);
      setRepoItem(null);
      setIsSending(false);
      props.onSuccess();
      props.onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    <small className="ms-0 ms-sm-2">
      <span className="d-none d-sm-inline">(</span>
      <small className="d-none d-md-inline text-muted me-1 text-uppercase">Publisher: </small>
      <div className={`d-inline me-1 ${styles.tinyIcon}`}>{repo.userAlias ? <FaUser /> : <MdBusiness />}</div>
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
              <span className="ms-2">Opting out</span>
            </>
          ) : (
            <div className="d-flex flex-row align-items-center text-uppercase">
              <IoMdLogOut className="me-2" />
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
        <label className={`form-label fw-bold ${styles.label}`} htmlFor="kind">
          Events
        </label>
        <div className="d-flex flex-column flex-wrap pb-2">
          {REPOSITORY_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
            return (
              <div className="mb-2" key={`radio_${subs.name}`}>
                <div className="form-check text-nowrap my-1 my-md-0">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="kind"
                    id={subs.name}
                    value={subs.kind}
                    disabled={!subs.enabled}
                    checked={subs.kind === eventKind}
                    onChange={() => setEventKind(subs.kind)}
                    required
                  />
                  <label className="form-check-label" htmlFor={subs.name}>
                    <div className="d-flex flex-row align-items-center ms-2">
                      {subs.icon}
                      <div className="ms-1">{subs.title}</div>
                    </div>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="d-flex flex-column mb-3">
          <label className={`form-label fw-bold ${styles.label}`} htmlFor="description">
            Repository
          </label>

          <small className="mb-2">Select repository:</small>

          {!isNull(repoItem) ? (
            <div
              data-testid="activeRepoItem"
              className={`border border-secondary border-1 w-100 rounded mt-1 ${styles.repoWrapper}`}
            >
              <div className="d-flex flex-row flex-nowrap align-items-stretch justify-content-between">
                <div className="flex-grow-1 text-truncate py-2">
                  <div className="d-flex flex-row align-items-center h-100 text-truncate">
                    <div className="d-none d-md-inline">
                      <RepositoryIcon kind={repoItem.kind} className={`mx-3 ${styles.icon}`} />
                    </div>

                    <div className="ms-2 me-2 me-sm-0 fw-bold mb-0 text-truncate">
                      {repoItem.name}
                      <span className="d-inline d-sm-none">
                        <span className="mx-2">/</span>
                        {getPublisher(repoItem)}
                      </span>
                    </div>

                    <div className="px-2 ms-auto w-50 text-dark text-truncate d-none d-sm-inline">
                      {getPublisher(repoItem)}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    className={`btn btn-close h-100 rounded-0 border-start border-1 px-3 py-0 ${styles.closeButton}`}
                    onClick={() => setRepoItem(null)}
                    aria-label="Close"
                  ></button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`mt-2 ${styles.searchWrapper}`}>
              <SearchRepositories
                label="repo-subscriptions"
                disabledRepositories={{
                  ids: props.disabledList,
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
