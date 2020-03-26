import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Organization } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import OrganizationForm from '../organizations/Form';
import styles from './OrgSettings.module.css';

interface Props {
  onAuthError: () => void;
}

const OrganizationSettings = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const form = useRef<HTMLFormElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | null | undefined>(undefined);
  const selectedOrg = ctx.org!;

  const submitForm = () => {
    if (form.current) {
      form.current.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  };

  useEffect(() => {
    async function fetchOrganization() {
      try {
        setIsLoading(true);
        setOrganization(await API.getOrganization(selectedOrg.name));
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        if (err.statusText !== 'ErrLoginRedirect') {
          setOrganization(null);
        } else {
          props.onAuthError();
        }
      }
    }
    fetchOrganization();
  }, [props, selectedOrg.name]);

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <div className="flex-grow-1">
        <div className="h3 pb-0">Settings</div>

        <div className={`mx-auto mt-5 ${styles.form}`}>
          {(isUndefined(organization) || isLoading) && <Loading />}

          {isNull(organization) || isUndefined(organization) ? (
            <NoData>Sorry, the information for this organization is missing.</NoData>
          ) : (
            <>
              <OrganizationForm
                ref={form}
                organization={organization}
                onAuthError={props.onAuthError}
                setIsSending={setIsSending}
              />

              <div className="text-right mt-4">
                <button className="btn btn-secondary" type="button" disabled={isSending} onClick={submitForm}>
                  {isSending ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ml-2">Updating organization</span>
                    </>
                  ) : (
                    <>Update</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default OrganizationSettings;
