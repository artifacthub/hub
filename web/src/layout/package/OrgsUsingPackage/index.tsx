import { sortBy } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { MdBusiness } from 'react-icons/md';

import useOverflowWrapper from '../../../hooks/useOverflowWrapper';
import { Organization } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import Image from '../../common/Image';
import Modal from '../../common/Modal';
import OrgCard from './Card';
import styles from './OrgsUsingPackage.module.css';

interface Props {
  organizations: Organization[];
  className?: string;
}

const MAX_HEIGHT = 35;
const MAX_ITEMS_NUMBER = 16;

const OrgsUsingPackage = (props: Props) => {
  const wrapper = useRef<HTMLDivElement | null>(null);
  const overflow = useOverflowWrapper(wrapper, MAX_HEIGHT, props.organizations.length);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [sortedOrgs, setSortedOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    setSortedOrgs(sortBy(props.organizations, (org: Organization) => org.displayName || org.name));
  }, [props.organizations]);

  useEffect(() => {
    if (!overflow && openStatus) {
      setOpenStatus(false);
    }
  }, [overflow]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (props.organizations.length === 0) return null;

  const getInfoCell = (org: Organization) => {
    return (
      <div className="d-flex flex-row align-items-center">
        <div className={`${styles.imageWrapper} imageWrapper overflow-hidden mr-2`}>
          <div className="d-flex align-items-center justify-content-center w-100 h-100">
            <Image
              alt={org.displayName || org.name}
              imageId={org.logoImageId}
              className={`m-auto ${styles.image}`}
              placeholderIcon={<MdBusiness />}
            />
          </div>
        </div>
        <div className="text-truncate pl-1">{org.displayName || org.name}</div>

        {org.homeUrl && (
          <small className="ml-2">
            <FiExternalLink />
          </small>
        )}
      </div>
    );
  };

  return (
    <div className={`mt-3 w-100 ${props.className}`}>
      <div className="mb-2 w-100 text-nowrap">
        <span className={`position-relative ${styles.orgIcon}`}>
          <MdBusiness />
        </span>
        <small className="text-muted ml-2">Organizations using this package in production:</small>
        <small className="font-weight-bold ml-2">{props.organizations.length}</small>
        {(overflow || props.organizations.length > MAX_ITEMS_NUMBER) && (
          <button
            className={`btn text-dark font-weight-bold btn-link btn-sm px-2 border-0 ${styles.seeAllbtn}`}
            onClick={() => setOpenStatus(true)}
            aria-label="See all organizations using this package in production"
          >
            (see all)
          </button>
        )}
      </div>

      <div className="d-flex flex-row pt-1">
        <div className={`overflow-hidden w-100 ${styles.content}`}>
          <div ref={wrapper} className="d-flex flex-row flex-wrap align-items-center">
            {props.organizations.slice(0, MAX_ITEMS_NUMBER).map((org: Organization) => (
              <OrgCard key={`org_${org.name}`} organization={org} />
            ))}
          </div>
        </div>
      </div>

      {openStatus && overflow && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName={styles.modal}
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Organizations using this package</div>}
          onClose={() => setOpenStatus(false)}
          open={openStatus}
        >
          <div className="my-3 mw-100">
            <table className={`table table-striped table-bordered table-sm mb-0 ${styles.table}`}>
              <tbody>
                {sortedOrgs.map((org: Organization) => {
                  return (
                    <tr key={`org-${org.name}`}>
                      <td>
                        {org.homeUrl ? (
                          <ExternalLink
                            href={org.homeUrl}
                            className="text-decoration-none text-reset"
                            label="Open organization url"
                          >
                            <>{getInfoCell(org)}</>
                          </ExternalLink>
                        ) : (
                          <>{getInfoCell(org)}</>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrgsUsingPackage;
