import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../../../../api';
import { APIKey, ErrorKind } from '../../../../../types';
import Loading from '../../../../common/Loading';
import NoData from '../../../../common/NoData';
import Pagination from '../../../../common/Pagination';
import styles from './APIKeysSection.module.css';
import APIKeyCard from './Card';
import APIKeyModal from './Modal';

interface Props {
  activePage: string | null;
  onAuthError: () => void;
}

interface ModalStatus {
  open: boolean;
  apiKey?: APIKey;
}

const DEFAULT_LIMIT = 10;

const APIKeysSection = (props: Props) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeysList, setApiKeysList] = useState<APIKey[] | undefined>(undefined);
  const [apiError, setApiError] = useState<string | JSX.Element | null>(null);
  const [modalStatus, setModalStatus] = useState<ModalStatus>({
    open: false,
  });
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
    navigate(`?page=${activePage}`, { replace: true });
  };

  async function getAPIKeys() {
    try {
      setIsLoading(true);
      const data = await API.getAPIKeys({
        limit: DEFAULT_LIMIT,
        offset: offset,
      });
      const total = parseInt(data.paginationTotalCount);
      if (total > 0 && data.items.length === 0) {
        onPageNumberChange(1);
      } else {
        setApiKeysList(data.items);
        setTotal(total);
      }
      updatePageNumber();
      setApiError(null);
      setIsLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setApiError('An error occurred getting your API keys, please try again later.');
        setApiKeysList([]);
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    getAPIKeys();
  }, []);

  useEffect(() => {
    if (props.activePage && activePage !== parseInt(props.activePage)) {
      getAPIKeys();
    }
  }, [activePage]);

  return (
    <div className="d-flex flex-column flex-grow-1">
      {(isUndefined(apiKeysList) || isLoading) && <Loading />}

      <main role="main" className="p-0">
        <div className="flex-grow-1">
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom border-1">
            <div className={`h3 pb-0 ${styles.title}`}>API keys</div>
            <div>
              <button
                className={`btn btn-outline-secondary btn-sm text-uppercase ${styles.btnAction}`}
                onClick={() => setModalStatus({ open: true })}
                aria-label="Open modal to add API key"
              >
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline me-2" />
                  <span className="d-none d-md-inline">Add</span>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4">
            {!isUndefined(apiKeysList) && (
              <div className="mt-4 mt-md-5">
                {apiKeysList.length === 0 ? (
                  <NoData issuesLinkVisible={!isNull(apiError)}>
                    {isNull(apiError) ? (
                      <>
                        <p className="h6 my-4">Add your first API key!</p>

                        <button
                          type="button"
                          className="btn btn-sm  btn-outline-secondary"
                          onClick={() => setModalStatus({ open: true })}
                          aria-label="Open API key modal to add the first one"
                        >
                          <div className="d-flex flex-row align-items-center text-uppercase">
                            <MdAddCircle className="me-2" />
                            <span>Add API key</span>
                          </div>
                        </button>
                      </>
                    ) : (
                      <>{apiError}</>
                    )}
                  </NoData>
                ) : (
                  <>
                    <div className="row mt-4 mt-md-5 gx-0 gx-xxl-4" data-testid="apiKeysList">
                      {apiKeysList.map((apiKey: APIKey) => (
                        <APIKeyCard
                          key={apiKey.apiKeyId!}
                          apiKey={apiKey}
                          setModalStatus={setModalStatus}
                          onSuccess={getAPIKeys}
                          onAuthError={props.onAuthError}
                        />
                      ))}
                    </div>
                    {!isUndefined(total) && (
                      <div className="mx-auto">
                        <Pagination
                          limit={DEFAULT_LIMIT}
                          offset={offset}
                          total={total}
                          active={activePage}
                          className="my-5"
                          onChange={onPageNumberChange}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <APIKeyModal
            {...modalStatus}
            onSuccess={getAPIKeys}
            onClose={() => setModalStatus({ open: false })}
            onAuthError={props.onAuthError}
          />
        </div>
      </main>
    </div>
  );
};

export default APIKeysSection;
