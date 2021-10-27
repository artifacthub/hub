import React from 'react';

import { Organization } from '../../../types';
import OrgCard from './Card';

interface Props {
  organizations: Organization[];
}

const OrgsUsingPackage = (props: Props) => {
  if (props.organizations.length === 0) return null;

  return (
    <>
      <div className="mt-3 mb-2">
        <small className="text-dark font-weight-bold">Organizations using this package in production:</small>
      </div>

      <div className="d-flex flex-row pb-3 pt-2">
        {props.organizations.map((org: Organization) => (
          <OrgCard key={`org_${org.name}`} organization={org} />
        ))}
      </div>
    </>
  );
};

export default React.memo(OrgsUsingPackage);
