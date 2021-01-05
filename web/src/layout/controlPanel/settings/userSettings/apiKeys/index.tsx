import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';

import { API } from '../../../../../api';
import { APIKey, ErrorKind } from '../../../../../types';
import Loading from '../../../../common/Loading';
import NoData from '../../../../common/NoData';
import styles from './APIKeysSection.module.css';
import APIKeyCard from './Card';
import APIKeyModal from './Modal';

interface Props {
  onAuthError: () => void;
}

interface ModalStatus {
  open: boolean;
  apiKey?: APIKey;
}

const APIKeysSection = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeysList, setApiKeysList] = useState<APIKey[] | undefined>(undefined);
  const [apiError, setApiError] = useState<string | JSX.Element | null>(null);
  const [modalStatus, setModalStatus] = useState<ModalStatus>({
    open: false,
  });

  async function getAPIKeys() {
    try {
      setIsLoading(true);
      setApiKeysList(await API.getAPIKeys());
      setApiError(null);
      setIsLoading(false);
    } catch (err) {
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
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className="d-flex flex-column flex-grow-1">
      {(isUndefined(apiKeysList) || isLoading) && <Loading />}

      <main role="main" className="p-0">
        <div className="flex-grow-1">
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom">
            <div className={`h3 pb-0 ${styles.title}`}>API keys</div>
            <div>
              <button
                data-testid="addAPIKeyBtn"
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

          <div className="mt-4">
            {!isUndefined(apiKeysList) && (
              <div className="mt-4 mt-md-5">
                {apiKeysList.length === 0 ? (
                  <NoData issuesLinkVisible={!isNull(apiError)}>
                    {isNull(apiError) ? (
                      <>
                        <p className="h6 my-4">Add your first API key!</p>

                        <button
                          data-testid="addFirstAPIKeyBtn"
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setModalStatus({ open: true })}
                        >
                          <div className="d-flex flex-row align-items-center">
                            <MdAddCircle className="mr-2" />
                            <span>Add API key</span>
                          </div>
                        </button>
                      </>
                    ) : (
                      <>{apiError}</>
                    )}
                  </NoData>
                ) : (
                  <div className="row mt-4 mt-md-5" data-testid="apiKeysList">
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
