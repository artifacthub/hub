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
      <div
        data-testid="org-using-pkg"
        className={`badge badge-rounded bg-light text-dark rounded-pill d-flex flex-row align-items-center ps-0 pe-3 border ${styles.badge}`}
      >
        <div className="me-2">
          <div className={`rounded-circle border bg-white ${styles.imageWrapper} imageWrapper overflow-hidden`}>
            <div className="d-flex align-items-center justify-content-center w-100 h-100">
              <Image
                alt={props.organization.displayName || props.organization.name}
                imageId={props.organization.logoImageId}
                className={`m-auto rounded-circle ${styles.image}`}
                placeholderIcon={<MdBusiness />}
              />
            </div>
          </div>
        </div>

        <div className={`text-truncate text-dark fw-bold ${styles.badgeContent}`}>
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
          className="d-inline-block text-dark h5 mb-2 me-3"
          label="Open organization url"
        >
          {renderLabel()}
        </ExternalLink>
      ) : (
        <div className="d-inline-block text-dark h5 mb-2 me-3">{renderLabel()}</div>
      )}
    </>
  );
};

export default OrgCard;
