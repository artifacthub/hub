import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';

import { API } from '../../../api';
import { Organization } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import OrganizationCard from './Card';
import OrganizationModal from './Modal';

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

  async function fetchOrganizations() {
    try {
      setIsLoading(true);
      setOrganizations(await API.getUserOrganizations());
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        setOrganizations([]);
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchOrganizations();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <div className="flex-grow-1 position-relative">
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between">
            <div className="h3 pb-0">Organizations</div>

            <div>
              <button
                data-testid="addOrgButton"
                className="btn btn-secondary btn-sm text-uppercase"
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
                <NoData>
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
                </NoData>
              ) : (
                <div className="list-group mt-4">
                  {organizations.map((org: Organization) => (
                    <OrganizationCard
                      key={`org_${org.name}`}
                      organization={org}
                      onAuthError={props.onAuthError}
                      onSuccess={fetchOrganizations}
                      setEditModalStatus={setModalStatus}
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
