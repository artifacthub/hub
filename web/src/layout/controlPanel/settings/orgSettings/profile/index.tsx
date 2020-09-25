import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { API } from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { AuthorizerAction, ErrorKind, Organization } from '../../../../../types';
import Loading from '../../../../common/Loading';
import NoData from '../../../../common/NoData';
import ActionBtn from '../../../ActionBtn';
import OrganizationForm from '../../../organizations/Form';
import styles from './ProfileSection.module.css';

interface Props {
  onAuthError: () => void;
}

const ProfileSection = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const form = useRef<HTMLFormElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | null | undefined>(undefined);
  const selectedOrg = ctx.prefs.controlPanel.selectedOrg;
  const [apiError, setApiError] = useState<null | string>(null);

  const submitForm = () => {
    if (form.current) {
      form.current.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  };

  async function fetchOrganization() {
    try {
      setIsLoading(true);
      const organization = await API.getOrganization(selectedOrg!);
      setOrganization(organization);
      if (isNull(organization)) {
        setApiError('Sorry, the organization you requested was not found.');
      } else {
        setApiError(null);
      }
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        if (err.kind === ErrorKind.NotFound) {
          setApiError('Sorry, the organization you requested was not found.');
        } else if (!isUndefined(err.message)) {
          setApiError(err.message);
        }
        setOrganization(null);
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    if (
      !isUndefined(selectedOrg) &&
      (isUndefined(organization) || (!isNull(organization) && selectedOrg !== organization.name))
    ) {
      fetchOrganization();
    }
  }, [selectedOrg]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <main role="main" className="container p-0">
      <div className={`h3 pb-2 border-bottom ${styles.title}`}>Profile information</div>

      <div className={`mt-4 mt-md-5 ${styles.form}`}>
        {(isUndefined(organization) || isLoading) && <Loading />}

        {!isUndefined(organization) && (
          <>
            {isNull(organization) ? (
              <NoData issuesLinkVisible={!isNull(apiError)}>
                {isNull(apiError) ? (
                  <>An error occurred getting the organization details, please try again later.</>
                ) : (
                  <>{apiError}</>
                )}
              </NoData>
            ) : (
              <>
                {!isLoading && (
                  <OrganizationForm
                    ref={form}
                    organization={!isLoading ? organization : undefined}
                    onAuthError={props.onAuthError}
                    onSuccess={fetchOrganization}
                    setIsSending={setIsSending}
                  />
                )}

                <div className="mt-4">
                  <ActionBtn
                    testId="updateOrgBtn"
                    className="btn btn-secondary"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      submitForm();
                    }}
                    action={AuthorizerAction.UpdateOrganization}
                    disabled={isSending}
                  >
                    <>
                      {isSending ? (
                        <>
                          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                          <span className="ml-2">Updating organization</span>
                        </>
                      ) : (
                        <>Update</>
                      )}
                    </>
                  </ActionBtn>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default ProfileSection;
