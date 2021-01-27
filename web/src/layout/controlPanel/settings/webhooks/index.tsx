import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ErrorKind, Webhook } from '../../../../types';
import Loading from '../../../common/Loading';
import NoData from '../../../common/NoData';
import WebhookCard from './Card';
import WebhookForm from './Form';
import styles from './WebhooksSection.module.css';

interface Props {
  onAuthError: () => void;
}

interface VisibleForm {
  visible: boolean;
  webhook?: Webhook;
}

const WebhooksSection = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isGettingWebhooks, setIsGettingWebhooks] = useState(false);
  const [webhooks, setWebhooks] = useState<Webhook[] | undefined>(undefined);
  const [apiError, setApiError] = useState<null | string>(null);
  const [visibleForm, setVisibleForm] = useState<VisibleForm | null>(null);

  async function fetchWebhooks() {
    try {
      setIsGettingWebhooks(true);
      setWebhooks(await API.getWebhooks(ctx.prefs.controlPanel.selectedOrg));
      setApiError(null);
      setIsGettingWebhooks(false);
    } catch (err) {
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
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

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
                <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom">
                  <div className={`h3 pb-0 ${styles.title}`}>Webhooks</div>

                  <div>
                    <button
                      className={`btn btn-secondary btn-sm text-uppercase ${styles.btnAction}`}
                      onClick={() => setVisibleForm({ visible: true })}
                      data-testid="addWebhookBtn"
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

              {(isGettingWebhooks || isUndefined(webhooks)) && <Loading />}

              <div className="mt-4 mt-md-5">
                <p className="m-0">Webhooks notify external services when certain events happen.</p>

                {!isUndefined(webhooks) && (
                  <>
                    {webhooks.length === 0 ? (
                      <NoData issuesLinkVisible={!isNull(apiError)}>
                        {isNull(apiError) ? (
                          <>
                            <p className="h6 my-4">
                              You have not created any webhook yet. You can create your first one by clicking on the
                              button below.
                            </p>

                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setVisibleForm({ visible: true })}
                              data-testid="addFirstWebhookBtn"
                            >
                              <div className="d-flex flex-row align-items-center">
                                <MdAddCircle className="mr-2" />
                                <span>Add webhook</span>
                              </div>
                            </button>
                          </>
                        ) : (
                          <>{apiError}</>
                        )}
                      </NoData>
                    ) : (
                      <div className="row mt-3 mt-md-4">
                        {webhooks.map((webhook: Webhook) => (
                          <WebhookCard
                            key={`member_${webhook.name}`}
                            webhook={webhook}
                            onEdition={() => setVisibleForm({ visible: true, webhook: webhook })}
                            onAuthError={props.onAuthError}
                            onDeletion={fetchWebhooks}
                          />
                        ))}
                      </div>
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
