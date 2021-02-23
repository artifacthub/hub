import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { IoMdRefresh, IoMdRefreshCircle } from 'react-icons/io';
import { MdAdd, MdAddCircle } from 'react-icons/md';
import { RiArrowLeftRightLine } from 'react-icons/ri';
import { useHistory } from 'react-router-dom';

import { API } from '../../../api';
import { AppCtx, unselectOrg } from '../../../context/AppCtx';
import { AuthorizerAction, ErrorKind, Repository as Repo } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import ActionBtn from '../ActionBtn';
import RepositoryCard from './Card';
import ClaimOwnershipRepositoryModal from './ClaimOwnershipModal';
import RepositoryModal from './Modal';
import styles from './Repository.module.css';

interface ModalStatus {
  open: boolean;
  repository?: Repo;
}

interface Props {
  onAuthError: () => void;
  repoName?: string;
  visibleModal?: string;
}

const RepositoriesSection = (props: Props) => {
  const history = useHistory();
  const { ctx, dispatch } = useContext(AppCtx);
  const [isLoading, setIsLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>({
    open: false,
  });
  const [openClaimRepo, setOpenClaimRepo] = useState<boolean>(false);
  const [repositories, setRepositories] = useState<Repo[] | undefined>(undefined);
  const [activeOrg, setActiveOrg] = useState<undefined | string>(ctx.prefs.controlPanel.selectedOrg);
  const [apiError, setApiError] = useState<null | string>(null);

  async function fetchRepositories() {
    try {
      setIsLoading(true);
      const repos = await API.getRepositories(activeOrg);
      setRepositories(repos);
      // Check if active repo logs modal is in the available repos
      if (!isUndefined(props.repoName)) {
        const activeRepo = repos.find((repo: Repo) => repo.name === props.repoName);
        // Clean query string if repo is not available
        if (isUndefined(activeRepo)) {
          dispatch(unselectOrg());
          history.replace({
            search: '',
          });
        }
      }
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
    <main
      role="main"
      className="pr-xs-0 pr-sm-3 pr-md-0 d-flex flex-column flex-md-row justify-content-between my-md-4"
    >
      <div className="flex-grow-1 w-100">
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
                data-testid="claimRepoBtn"
                className={`btn btn-secondary btn-sm text-uppercase mr-0 mr-md-2 ${styles.btnAction}`}
                onClick={() => setOpenClaimRepo(true)}
              >
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <RiArrowLeftRightLine className="mr-md-2" />
                  <span className="d-none d-md-inline">Claim ownership</span>
                </div>
              </button>

              <ActionBtn
                testId="addRepoBtn"
                className={`btn btn-secondary btn-sm text-uppercase ${styles.btnAction}`}
                contentClassName="justify-content-center"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  setModalStatus({ open: true });
                }}
                action={AuthorizerAction.AddOrganizationRepository}
              >
                <>
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline mr-2" />
                  <span className="d-none d-md-inline">Add</span>
                </>
              </ActionBtn>
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

        {openClaimRepo && (
          <ClaimOwnershipRepositoryModal
            open={openClaimRepo}
            onAuthError={props.onAuthError}
            onClose={() => setOpenClaimRepo(false)}
            onSuccess={fetchRepositories}
          />
        )}

        {(isLoading || isUndefined(repositories)) && <Loading />}

        <p className="mt-5">
          If you want your repositories to be labeled as <span className="font-weight-bold">Verified Publisher</span>,
          you can add a{' '}
          <ExternalLink
            href="https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml"
            className="text-reset"
          >
            <u>metadata file</u>
          </ExternalLink>{' '}
          to each of them including the repository ID provided below. This label will let users know that you own or
          have control over the repository. The repository metadata file must be located at the path used in the
          repository URL.
        </p>

        {!isUndefined(repositories) && (
          <>
            {repositories.length === 0 ? (
              <NoData issuesLinkVisible={!isNull(apiError)}>
                {isNull(apiError) ? (
                  <>
                    <p className="h6 my-4">Add your first repository!</p>

                    <ActionBtn
                      testId="addFirstRepoBtn"
                      className="btn btn-secondary"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        setModalStatus({ open: true });
                      }}
                      action={AuthorizerAction.AddOrganizationRepository}
                    >
                      <>
                        <MdAddCircle className="mr-2" />
                        <span>Add repository</span>
                      </>
                    </ActionBtn>
                  </>
                ) : (
                  <>{apiError}</>
                )}
              </NoData>
            ) : (
              <div className="row mt-3 mt-md-4" data-testid="repoList">
                {repositories.map((repo: Repo) => (
                  <RepositoryCard
                    key={repo.name}
                    repository={repo}
                    visibleModal={
                      // Legacy - old tracking errors email were not passing modal param
                      !isUndefined(props.repoName) && repo.name === props.repoName
                        ? props.visibleModal || 'tracking'
                        : undefined
                    }
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
