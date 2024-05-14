import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ErrorKind, Webhook } from '../../../../types';
import Loading from '../../../common/Loading';
import NoData from '../../../common/NoData';
import Pagination from '../../../common/Pagination';
import WebhookCard from './Card';
import WebhookForm from './Form';
import styles from './WebhooksSection.module.css';

interface Props {
  activePage: string | null;
  onAuthError: () => void;
}

const DEFAULT_LIMIT = 10;

interface VisibleForm {
  visible: boolean;
  webhook?: Webhook;
}

const WebhooksSection = (props: Props) => {
  const navigate = useNavigate();
  const { ctx } = useContext(AppCtx);
  const [isGettingWebhooks, setIsGettingWebhooks] = useState(false);
  const [webhooks, setWebhooks] = useState<Webhook[] | undefined>(undefined);
  const [apiError, setApiError] = useState<null | string>(null);
  const [visibleForm, setVisibleForm] = useState<VisibleForm | null>(null);
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

  async function fetchWebhooks() {
    try {
      setIsGettingWebhooks(true);
      const data = await API.getWebhooks(
        {
          limit: DEFAULT_LIMIT,
          offset: offset,
        },
        ctx.prefs.controlPanel.selectedOrg
      );
      const total = parseInt(data.paginationTotalCount);
      if (total > 0 && data.items.length === 0) {
        onPageNumberChange(1);
      } else {
        setWebhooks(data.items);
        setTotal(total);
      }
      updatePageNumber();
      setApiError(null);
      setIsGettingWebhooks(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsGettingWebhooks(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setWebhooks([]);
        setApiError('An error occurred getting webhooks, please try again later.');
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  useEffect(() => {
    if (props.activePage && activePage !== parseInt(props.activePage)) {
      fetchWebhooks();
    }
  }, [activePage]);

  return (
    <div className="d-flex flex-column flex-grow-1">
      <main role="main" className="p-0">
        <div className="flex-grow-1">
          {!isNull(visibleForm) ? (
            <WebhookForm
              onClose={() => setVisibleForm(null)}
              onSuccess={fetchWebhooks}
              webhook={visibleForm.webhook}
              {...props}
            />
          ) : (
            <>
              <div>
                <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom border-1">
                  <div className={`h3 pb-0 ${styles.title}`}>Webhooks</div>

                  <div>
                    <button
                      className={`btn btn-outline-secondary btn-sm text-uppercase ${styles.btnAction}`}
                      onClick={() => setVisibleForm({ visible: true })}
                      aria-label="Open webhook form"
                    >
                      <div className="d-flex flex-row align-items-center justify-content-center">
                        <MdAdd className="d-inline d-md-none" />
                        <MdAddCircle className="d-none d-md-inline me-2" />
                        <span className="d-none d-md-inline">Add</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {(isGettingWebhooks || isUndefined(webhooks)) && <Loading />}

              <div className="mt-4 mt-md-5">
                <p className="m-0">Webhooks notify external services when certain events happen.</p>

                {!isUndefined(webhooks) && (
                  <>
                    {webhooks.length === 0 ? (
                      <NoData issuesLinkVisible={!isNull(apiError)}>
                        {isNull(apiError) ? (
                          <>
                            <p className="h6 my-4 lh-base">
                              You have not created any webhook yet. You can create your first one by clicking on the
                              button below.
                            </p>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setVisibleForm({ visible: true })}
                              aria-label="Open form for creating your first webhook"
                            >
                              <div className="d-flex flex-row align-items-center text-uppercase">
                                <MdAddCircle className="me-2" />
                                <span>Add webhook</span>
                              </div>
                            </button>
                          </>
                        ) : (
                          <>{apiError}</>
                        )}
                      </NoData>
                    ) : (
                      <>
                        <div className="row mt-3 mt-md-4 gx-0 gx-xxl-4">
                          {webhooks.map((webhook: Webhook) => (
                            <WebhookCard
                              key={`webhook_${webhook.webhookId}`}
                              webhook={webhook}
                              onEdition={() => setVisibleForm({ visible: true, webhook: webhook })}
                              onAuthError={props.onAuthError}
                              onDeletion={fetchWebhooks}
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
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default WebhooksSection;
