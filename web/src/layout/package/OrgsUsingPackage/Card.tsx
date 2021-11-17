import React from 'react';
import { MdBusiness } from 'react-icons/md';

import { Organization } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import Image from '../../common/Image';
import styles from './Card.module.css';

interface Props {
  organization: Organization;
}

const OrgCard = (props: Props) => {
  const renderLabel = (): JSX.Element => {
    return (
      <div data-testid="org-using-pkg" className="d-flex flex-row align-items-center">
        <div className="mr-1">
          <div className={`${styles.imageWrapper} imageWrapper overflow-hidden`}>
            <div className="d-flex align-items-center justify-content-center w-100 h-100">
              <Image
                alt={props.organization.displayName || props.organization.name}
                imageId={props.organization.logoImageId}
                className={`m-auto ${styles.image}`}
                placeholderIcon={<MdBusiness />}
              />
            </div>
          </div>
        </div>

        <div className={`text-truncate text-dark font-weight-bold ${styles.badgeContent}`}>
          <span>{props.organization.displayName || props.organization.name}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {props.organization.homeUrl ? (
        <ExternalLink
          href={props.organization.homeUrl}
          className="d-inline-block text-dark mr-3 mb-2"
          label="Open organization url"
        >
          {renderLabel()}
        </ExternalLink>
      ) : (
        <div className="d-inline-block mr-3 mb-2">{renderLabel()}</div>
      )}
    </>
  );
};

export default OrgCard;
