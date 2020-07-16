import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { IoMdRefresh, IoMdRefreshCircle } from 'react-icons/io';
import { MdAdd, MdAddCircle } from 'react-icons/md';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Repository as Repo } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import RepositoryCard from './Card';
import RepositoryModal from './Modal';
import styles from './Repository.module.css';

interface ModalStatus {
  open: boolean;
  repository?: Repo;
}

interface Props {
  onAuthError: () => void;
}

const RepositoriesSection = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isLoading, setIsLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>({
    open: false,
  });
  const [repositories, setRepositories] = useState<Repo[] | undefined>(undefined);
  const [activeOrg, setActiveOrg] = useState<undefined | string>(ctx.prefs.controlPanel.selectedOrg);
  const [apiError, setApiError] = useState<null | string>(null);

  async function fetchRepositories() {
    try {
      setIsLoading(true);
      setRepositories(await API.getRepositories(activeOrg));
      setApiError(null);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setApiError('An error occurred getting the repositories, please try again later.');
        setRepositories([]);
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchRepositories();
  }, [activeOrg]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    setActiveOrg(ctx.prefs.controlPanel.selectedOrg);
  }, [ctx.prefs.controlPanel.selectedOrg]);

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <div className="flex-grow-1">
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom">
            <div className={`h3 pb-0 ${styles.title}`}>Repositories</div>

            <div>
              <button
                data-testid="refreshRepoBtn"
                className={`btn btn-secondary btn-sm text-uppercase mr-0 mr-md-2 ${styles.btnAction}`}
                onClick={fetchRepositories}
              >
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <IoMdRefresh className="d-inline d-md-none" />
                  <IoMdRefreshCircle className="d-none d-md-inline mr-2" />
                  <span className="d-none d-md-inline">Refresh</span>
                </div>
              </button>

              <button
                className={`btn btn-secondary btn-sm text-uppercase ${styles.btnAction}`}
                onClick={() => setModalStatus({ open: true })}
              >
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline mr-2" />
                  <span className="d-none d-md-inline">Add</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {modalStatus.open && (
          <RepositoryModal
            open={modalStatus.open}
            repository={modalStatus.repository}
            onSuccess={fetchRepositories}
            onAuthError={props.onAuthError}
            onClose={() => setModalStatus({ open: false })}
          />
        )}

        {(isLoading || isUndefined(repositories)) && <Loading />}

        {!isUndefined(repositories) && (
          <>
            {repositories.length === 0 ? (
              <NoData issuesLinkVisible={!isNull(apiError)}>
                {isNull(apiError) ? (
                  <>
                    <p className="h6 my-4">Add your first repository!</p>

                    <button
                      data-testid="addFirstRepoBtn"
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setModalStatus({ open: true })}
                    >
                      <div className="d-flex flex-row align-items-center">
                        <MdAddCircle className="mr-2" />
                        <span>Add repository</span>
                      </div>
                    </button>
                  </>
                ) : (
                  <>{apiError}</>
                )}
              </NoData>
            ) : (
              <div className="list-group mt-4 mt-md-5" data-testid="repoList">
                {repositories.map((repo: Repo) => (
                  <RepositoryCard
                    key={repo.name}
                    repository={repo}
                    setModalStatus={setModalStatus}
                    onSuccess={fetchRepositories}
                    onAuthError={props.onAuthError}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default RepositoriesSection;
