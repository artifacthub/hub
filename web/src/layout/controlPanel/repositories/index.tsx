import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { MouseEvent as ReactMouseEvent, useContext, useEffect, useState } from 'react';
import { IoMdRefresh, IoMdRefreshCircle } from 'react-icons/io';
import { MdAdd, MdAddCircle } from 'react-icons/md';
import { RiArrowLeftRightLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

import API from '../../../api';
import { AppCtx, unselectOrg } from '../../../context/AppCtx';
import { AuthorizerAction, ErrorKind, Repository as Repo, SearchQuery } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import Pagination from '../../common/Pagination';
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
  repoName?: string | null;
  visibleModal: string | null;
  activePage: string | null;
}

const DEFAULT_LIMIT = 10;

const RepositoriesSection = (props: Props) => {
  const navigate = useNavigate();
  const { ctx, dispatch } = useContext(AppCtx);
  const [isLoading, setIsLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>({
    open: false,
  });
  const [openClaimRepo, setOpenClaimRepo] = useState<boolean>(false);
  const [repositories, setRepositories] = useState<Repo[] | undefined>(undefined);
  const [activeOrg, setActiveOrg] = useState<undefined | string>(ctx.prefs.controlPanel.selectedOrg);
  const [apiError, setApiError] = useState<null | string>(null);
  const [activePage, setActivePage] = useState<number>(props.activePage ? parseInt(props.activePage) : 1);

  const calculateOffset = (pageNumber?: number): number => {
    return DEFAULT_LIMIT * ((pageNumber || activePage) - 1);
  };

  const [offset, setOffset] = useState<number>(calculateOffset());
  const [total, setTotal] = useState<number | undefined>(undefined);

  const onPageNumberChange = (pageNumber: number): void => {
    setOffset(calculateOffset(pageNumber));
    setActivePage(pageNumber);
  };

  const updatePageNumber = () => {
    navigate(
      {
        search: `?page=${activePage}${props.repoName ? `&repo-name=${props.repoName}` : ''}${
          props.visibleModal ? `&modal=${props.visibleModal}` : ''
        }`,
      },
      { replace: true }
    );
  };

  async function fetchRepositories() {
    try {
      setIsLoading(true);
      const filters: { [key: string]: string[] } = {};
      if (activeOrg) {
        filters.org = [activeOrg];
      } else {
        filters.user = [ctx.user!.alias];
      }
      const query: SearchQuery = {
        offset: offset,
        limit: DEFAULT_LIMIT,
        filters: filters,
      };
      const data = await API.searchRepositories(query);
      const total = parseInt(data.paginationTotalCount);
      if (total > 0 && data.items.length === 0) {
        onPageNumberChange(1);
      } else {
        const repos = data.items;
        setRepositories(repos);
        setTotal(total);
        // Check if active repo logs modal is in the available repos
        if (props.repoName) {
          const activeRepo = repos.find((repo: Repo) => repo.name === props.repoName);
          // Clean query string if repo is not available
          if (isUndefined(activeRepo)) {
            dispatch(unselectOrg());
            navigate(`?page=${activePage}`);
          }
        } else {
          updatePageNumber();
        }
      }
      setApiError(null);
      setIsLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
    if (isUndefined(props.activePage) || isNull(props.activePage)) {
      updatePageNumber();
    }
  }, []);

  useEffect(() => {
    if (props.activePage && activePage !== parseInt(props.activePage)) {
      fetchRepositories();
    }
  }, [activePage]);

  useEffect(() => {
    if (!isUndefined(repositories)) {
      if (activePage === 1) {
        // fetchRepositories is forced when context changes
        fetchRepositories();
      } else {
        // when current page is different to 1, to update page number fetchRepositories is called
        onPageNumberChange(1);
      }
    }
  }, [activeOrg]);

  useEffect(() => {
    if (activeOrg !== ctx.prefs.controlPanel.selectedOrg) {
      setActiveOrg(ctx.prefs.controlPanel.selectedOrg);
    }
  }, [ctx.prefs.controlPanel.selectedOrg]);

  useEffect(() => {
    fetchRepositories();
  }, []);

  return (
    <main
      role="main"
      className="pe-xs-0 pe-sm-3 pe-md-0 d-flex flex-column flex-md-row justify-content-between my-md-4"
    >
      <div className="flex-grow-1 w-100">
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom border-1">
            <div className={`h3 pb-0 ${styles.title}`}>Repositories</div>

            <div>
              <button
                className={`btn btn-outline-secondary btn-sm text-uppercase me-0 me-md-2 ${styles.btnAction}`}
                onClick={fetchRepositories}
                aria-label="Refresh repositories list"
              >
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <IoMdRefresh className="d-inline d-md-none" />
                  <IoMdRefreshCircle className="d-none d-md-inline me-2" />
                  <span className="d-none d-md-inline">Refresh</span>
                </div>
              </button>

              <button
                className={`btn btn-outline-secondary btn-sm text-uppercase me-0 me-md-2 ${styles.btnAction}`}
                onClick={() => setOpenClaimRepo(true)}
                aria-label="Open claim repository modal"
              >
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <RiArrowLeftRightLine className="me-md-2" />
                  <span className="d-none d-md-inline">Claim ownership</span>
                </div>
              </button>

              <ActionBtn
                className={`btn btn-outline-secondary btn-sm text-uppercase ${styles.btnAction}`}
                contentClassName="justify-content-center"
                onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  setModalStatus({ open: true });
                }}
                action={AuthorizerAction.AddOrganizationRepository}
                label="Open add repository modal"
              >
                <>
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline me-2" />
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
          If you want your repositories to be labeled as <span className="fw-bold">Verified Publisher</span>, you can
          add a{' '}
          <ExternalLink
            href="https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml"
            className="text-reset"
            label="Open documentation"
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
                      className="btn btn-sm btn-outline-secondary"
                      onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        setModalStatus({ open: true });
                      }}
                      action={AuthorizerAction.AddOrganizationRepository}
                      label="Open add first repository modal"
                    >
                      <div className="d-flex flex-row align-items-center text-uppercase">
                        <MdAddCircle className="me-2" />
                        <span>Add repository</span>
                      </div>
                    </ActionBtn>
                  </>
                ) : (
                  <>{apiError}</>
                )}
              </NoData>
            ) : (
              <>
                <div className="row mt-3 mt-md-4 gx-0 gx-xxl-4" data-testid="repoList">
                  {repositories.map((repo: Repo) => (
                    <RepositoryCard
                      key={`repo_${repo.name}`}
                      repository={repo}
                      visibleModal={
                        // Legacy - old tracking errors email were not passing modal param
                        props.repoName && repo.name === props.repoName ? props.visibleModal || 'tracking' : undefined
                      }
                      setModalStatus={setModalStatus}
                      onSuccess={fetchRepositories}
                      onAuthError={props.onAuthError}
                    />
                  ))}
                </div>
                {!isUndefined(total) && (
                  <Pagination
                    limit={DEFAULT_LIMIT}
                    offset={offset}
                    total={total}
                    active={activePage}
                    className="my-5"
                    onChange={onPageNumberChange}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default RepositoriesSection;
