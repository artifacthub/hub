import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';

import { API } from '../../../api';
import { ErrorKind, Organization } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import OrganizationCard from './Card';
import OrganizationModal from './Modal';
import styles from './OrganizationsSection.module.css';

interface ModalStatus {
  open: boolean;
  organization?: Organization;
}

interface Props {
  onAuthError: () => void;
}

const OrganizationsSection = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>({
    open: false,
  });
  const [organizations, setOrganizations] = useState<Organization[] | undefined>(undefined);
  const [apiError, setApiError] = useState<null | string>(null);

  async function fetchOrganizations() {
    try {
      setIsLoading(true);
      setOrganizations(await API.getUserOrganizations());
      setApiError(null);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setOrganizations([]);
        setApiError('An error occurred getting your organizations, please try again later.');
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchOrganizations();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <main
      role="main"
      className="px-xs-0 px-sm-3 px-lg-0 d-flex flex-column flex-md-row justify-content-between my-md-4"
    >
      <div className="flex-grow-1 w-100">
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom">
            <div className={`h3 pb-0 ${styles.title}`}>Organizations</div>

            <div>
              <button
                data-testid="addOrgButton"
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

          {(isLoading || isUndefined(organizations)) && <Loading />}

          {!isUndefined(organizations) && (
            <>
              {organizations.length === 0 ? (
                <NoData issuesLinkVisible={!isNull(apiError)}>
                  {isNull(apiError) ? (
                    <>
                      <p className="h6 my-4">Do you need to create a organization?</p>

                      <button
                        data-testid="addFirstOrgBtn"
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setModalStatus({ open: true })}
                      >
                        <div className="d-flex flex-row align-items-center">
                          <MdAddCircle className="mr-2" />
                          <span>Add new organization</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>{apiError}</>
                  )}
                </NoData>
              ) : (
                <div className="row mt-4 mt-md-5">
                  {organizations.map((org: Organization) => (
                    <OrganizationCard
                      key={`org_${org.name}`}
                      organization={org}
                      onAuthError={props.onAuthError}
                      onSuccess={fetchOrganizations}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <OrganizationModal
        {...modalStatus}
        onSuccess={fetchOrganizations}
        onAuthError={props.onAuthError}
        onClose={() => setModalStatus({ open: false })}
      />
    </main>
  );
};

export default OrganizationsSection;
