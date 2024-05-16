import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useState } from 'react';

import API from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, Organization } from '../../../../../types';
import Loading from '../../../../common/Loading';
import NoData from '../../../../common/NoData';
import DeleteOrganization from './DeleteOrg';
import styles from './ProfileSection.module.css';
import UpdateOrganization from './UpdateOrg';

interface Props {
  onAuthError: () => void;
}

const ProfileSection = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isLoading, setIsLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | null | undefined>(undefined);
  const selectedOrg = ctx.prefs.controlPanel.selectedOrg;
  const [apiError, setApiError] = useState<null | string>(null);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
  }, [selectedOrg]);

  return (
    <main role="main" className="p-0">
      {(isUndefined(organization) || isLoading) && <Loading />}

      <div className={`h3 pb-2 border-bottom border-1 ${styles.title}`}>Profile information</div>

      <div
        className={classnames('mt-4 mt-md-5 mb-5 mw-100', {
          [styles.form]: !isNull(organization),
        })}
      >
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
              <UpdateOrganization
                onAuthError={props.onAuthError}
                onSuccess={fetchOrganization}
                selectedOrg={selectedOrg!}
                isLoading={isLoading}
                organization={organization}
              />
            )}
          </>
        )}
      </div>

      <div className={`h3 mb-4 pb-2 border-bottom border-1 ${styles.title}`}>Delete organization</div>

      {organization && <DeleteOrganization organization={organization} onAuthError={props.onAuthError} />}
    </main>
  );
};

export default ProfileSection;
