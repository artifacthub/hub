import React from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { MdBusiness } from 'react-icons/md';

import { Organization } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import Image from '../../common/Image';
import styles from './Card.module.css';

interface Props {
  organization: Organization;
}

const OrgCard = (props: Props) => {
  const renderLabel = (withIcon: boolean): JSX.Element => {
    return (
      <div
        className={`badge badge-rounded badge-light rounded-pill d-flex flex-row border align-items-center pl-0 pr-3 ${styles.badge}`}
      >
        <div className="mr-2">
          <div className={`${styles.imageWrapper} imageWrapper`}>
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

        <div className={`text-truncate ${styles.badgeContent}`}>
          <span>{props.organization.displayName || props.organization.name}</span>
        </div>

        {withIcon && (
          <small className="ml-2">
            <FiExternalLink />
          </small>
        )}
      </div>
    );
  };

  return (
    <>
      {props.organization.homeUrl ? (
        <ExternalLink
          href="https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml"
          className="d-inline-block text-decoration-none text-dark h5 mb-2 mr-3"
          label="Open organization url"
        >
          {renderLabel(true)}
        </ExternalLink>
      ) : (
        <div className="d-inline-block text-decoration-none text-dark h5 mb-2 mr-3">{renderLabel(false)}</div>
      )}
    </>
  );
};

export default OrgCard;
