import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useRef, useState } from 'react';
import { MdBusiness } from 'react-icons/md';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Organization } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import ExternalLink from './ExternalLink';
import Image from './Image';
import styles from './OrganizationInfo.module.css';

interface Props {
  organizationName: string;
  organizationDisplayName?: string | null;
  deprecated: null | boolean;
  className?: string;
  labelClassName?: string;
  visibleLegend: boolean;
}

const OrganizationInfo = (props: Props) => {
  const history = useHistory();
  const ref = useRef(null);
  const [organization, setOrganization] = useState<Organization | null | undefined>(undefined);
  const [openStatus, setOpenStatus] = useState(false);
  const [onLinkHover, setOnLinkHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  async function fetchOrganization() {
    try {
      setOrganization(await API.getOrganization(props.organizationName));
    } catch (err) {
      if (err.statusText !== 'ErrLoginRedirect') {
        setOrganization(null);
      }
    }
  }

  const openOrgInfo = () => {
    if (isUndefined(organization)) {
      fetchOrganization();
    }
  };

  useEffect(() => {
    if (!isUndefined(organization) && !openStatus && (onLinkHover || onDropdownHover)) {
      setOpenStatus(true);
    }
    if (openStatus && !onLinkHover && !onDropdownHover) {
      setOpenStatus(false);
    }
  }, [onLinkHover, onDropdownHover, organization, openStatus]);

  return (
    <div className={`text-truncate ${props.className}`}>
      <div className="position-absolute">
        <div
          ref={ref}
          data-testid="orgInfoDropdown"
          className={classnames('dropdown-menu dropdown-menu-left', styles.dropdown, {
            show: openStatus,
          })}
          onMouseEnter={() => setOnDropdownHover(true)}
          onMouseLeave={() => setOnDropdownHover(false)}
        >
          {!isUndefined(organization) && !isNull(organization) && (
            <div className={styles.content}>
              <div className="d-flex flex-row align-items-center">
                <div
                  className={`d-flex align-items-center justify-content-center p-1 overflow-hidden mr-2 ${styles.imageWrapper}`}
                >
                  {!isUndefined(organization.logoImageId) ? (
                    <Image
                      alt={organization.displayName || organization.name}
                      imageId={organization.logoImageId}
                      className={styles.image}
                    />
                  ) : (
                    <MdBusiness className={styles.image} />
                  )}
                </div>

                <div>
                  <h6 className="mb-0">{organization.displayName || organization.name}</h6>
                </div>
              </div>

              {!isUndefined(organization.homeUrl) && !isNull(organization.homeUrl) && (
                <div className="mt-1 text-truncate">
                  <small className="text-muted text-uppercase mr-1">Homepage: </small>
                  <ExternalLink href={organization.homeUrl} className={`text-reset ${styles.externalLink}`} btnType>
                    {organization.homeUrl}
                  </ExternalLink>
                </div>
              )}

              {!isUndefined(organization.description) && !isNull(organization.description) && (
                <div className={`mt-2 text-muted ${styles.description}`}>{organization.description}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {props.visibleLegend && <span className={`text-muted text-uppercase mr-1 ${props.labelClassName}`}>Org:</span>}

      <button
        data-testid="orgLink"
        className={`p-0 border-0 ${styles.link}`}
        onClick={(e) => {
          e.preventDefault();
          history.push({
            pathname: '/packages/search',
            search: prepareQueryString({
              pageNumber: 1,
              filters: {
                org: [props.organizationName!],
              },
              deprecated: isNull(props.deprecated) ? false : props.deprecated,
            }),
          });
        }}
        onMouseEnter={(e) => {
          e.preventDefault();
          setOnLinkHover(true);
          openOrgInfo();
        }}
        onMouseLeave={() => {
          setOnLinkHover(false);
        }}
      >
        <u>
          {!isUndefined(props.organizationDisplayName) && props.organizationDisplayName ? (
            <>{props.organizationDisplayName}</>
          ) : (
            <>{props.organizationName}</>
          )}
        </u>
      </button>
    </div>
  );
};

export default OrganizationInfo;
