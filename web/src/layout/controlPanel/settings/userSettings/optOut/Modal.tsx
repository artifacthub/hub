import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { MdBusiness, MdClose } from 'react-icons/md';
import { TiWarning } from 'react-icons/ti';

import { API } from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, EventKind, OptOutItem, Organization, Repository } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import Modal from '../../../../common/Modal';
import RepositoryIcon from '../../../../common/RepositoryIcon';
import styles from './Modal.module.css';
import SearchTypeaheadRepository from './SearchTypeaheadRepository';

interface Props {
  open: boolean;
  optOutList?: OptOutItem[];
  onSuccess: () => void;
  onClose: () => void;
  onAuthError: () => void;
}

const OptOutModal = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const typeaheadWrapperRef = useRef<HTMLDivElement | null>(null);
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

    const selectedRepos = props.optOutList.filter(
      (item: OptOutItem) => !isUndefined(item.eventKinds) && item.eventKinds.includes(eventKind)
    );

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
          message: `An error occurred adding the opt-out entry for tracking errors notifications for repository ${
            repoItem!.displayName || repoItem!.name
          }, please try again later.`,
        });
      }
    }
  }

  return (
    <Modal
      header={<div className={`h3 m-2 ${styles.title}`}>Add opt-out entry</div>}
      open={props.open}
      modalDialogClassName={styles.modal}
      closeButton={
        <button
          data-testid="addSubsModalBtn"
          className="btn btn-secondary"
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
            <>Opt-out</>
          )}
        </button>
      }
      onClose={onCloseModal}
      error={apiError}
      cleanError={() => setApiError(null)}
      excludedRefs={[typeaheadWrapperRef]}
      noScrollable
    >
      <div className="w-100 position-relative">
        <label className={`font-weight-bold ${styles.label}`} htmlFor="kind">
          Events
        </label>

        <div className="custom-control custom-radio mb-3">
          <input
            data-testid={`radio_trackingError`}
            className="custom-control-input"
            type="radio"
            name="kind"
            id="repositoryTrackingError"
            value={EventKind.RepositoryTrackingErrors}
            onChange={() => setEventKind(EventKind.RepositoryTrackingErrors)}
            checked
            required
          />
          <label className="custom-control-label" htmlFor="repositoryTrackingError">
            <div className="d-flex flex-row align-items-center ml-2">
              <TiWarning />
              <div className="ml-1">Tracking errors</div>
            </div>
          </label>
        </div>

        <div className="d-flex flex-column mb-3">
          <label className={`font-weight-bold ${styles.label}`} htmlFor="description">
            Repository
          </label>

          <small className="mb-2">Select repository:</small>

          {!isNull(repoItem) ? (
            <div
              data-testid="activePackageItem"
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
                        <small className={`d-none d-md-inline text-uppercase text-muted ${styles.legend}`}>
                          Publisher:{' '}
                        </small>
                        <div className={`mx-1 ${styles.tinyIcon}`}>
                          {!isUndefined(repoItem.userAlias) ? <FaUser /> : <MdBusiness />}
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
            <div className={`mt-2 ${styles.searchWrapper}`} ref={typeaheadWrapperRef}>
              <SearchTypeaheadRepository
                repositories={repositories || []}
                disabled={getSubscribedReposIds()}
                isLoading={isLoading}
                onSelect={onRepoSelect}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OptOutModal;
