import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';
import { MdBusiness } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../api';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Organization } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import ExternalLink from './ExternalLink';
import Image from './Image';
import styles from './OrganizationInfo.module.css';

interface Props {
  organizationName: string;
  organizationDisplayName?: string | null;
  deprecated?: null | boolean;
  className?: string;
  btnClassName?: string;
  visibleLegend: boolean;
  multiLine?: boolean;
}

const FETCH_DELAY = 1 * 100; // 100ms

const OrganizationInfo = (props: Props) => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [organization, setOrganization] = useState<Organization | null | undefined>(undefined);
  const [openStatus, setOpenStatus] = useState(false);
  const [onLinkHover, setOnLinkHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  const [fetchTimeout, setFetchTimeout] = useState<NodeJS.Timeout | null>(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  async function fetchOrganization() {
    try {
      setOrganization(await API.getOrganization(props.organizationName));
    } catch {
      setOrganization(null);
    }
  }

  const openOrgInfo = () => {
    if (isUndefined(organization)) {
      setFetchTimeout(
        setTimeout(() => {
          fetchOrganization();
        }, FETCH_DELAY)
      );
    }
  };

  const cleanFetchTimeout = () => {
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (organization && !openStatus && (onLinkHover || onDropdownHover)) {
      timeout = setTimeout(() => {
        setOpenStatus(true);
      }, 100);
    }
    if (openStatus && !onLinkHover && !onDropdownHover) {
      timeout = setTimeout(() => {
        // Delay to hide the dropdown to avoid hide it if user changes from link to dropdown
        setOpenStatus(false);
      }, 50);
    }

    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
      cleanFetchTimeout();
    };
  }, [onLinkHover, onDropdownHover, organization, openStatus]);

  return (
    <div className={props.className}>
      <div className="position-absolute">
        <div
          ref={ref}
          role="complementary"
          className={classnames('dropdown-menu dropdown-menu-left text-wrap', styles.dropdown, {
            show: openStatus,
          })}
          onMouseEnter={() => setOnDropdownHover(true)}
          onMouseLeave={() => setOnDropdownHover(false)}
        >
          {organization && (
            <div className={styles.content}>
              <div className="d-flex flex-row align-items-center">
                <div
                  className={`d-flex align-items-center justify-content-center overflow-hidden me-2 position-relative ${styles.imageWrapper}`}
                >
                  {organization.logoImageId ? (
                    <Image
                      alt={organization.displayName || organization.name}
                      imageId={organization.logoImageId}
                      className={`fs-4 ${styles.image}`}
                      placeholderIcon={<MdBusiness />}
                    />
                  ) : (
                    <MdBusiness className={`fs-4 ${styles.image}`} />
                  )}
                </div>

                <div>
                  <h6 className="mb-0">{organization.displayName || organization.name}</h6>
                </div>
              </div>

              {organization.homeUrl && (
                <div className="mt-2 text-truncate d-flex flex-row align-items-baseline">
                  <small className="text-muted text-uppercase me-1">Homepage: </small>
                  <ExternalLink
                    href={organization.homeUrl}
                    className={`text-reset text-truncate lh-1 bg-transparent ${styles.externalLink}`}
                    label={`Open link ${organization.homeUrl}`}
                    btnType
                  >
                    <div className="text-truncate">{organization.homeUrl}</div>
                  </ExternalLink>
                </div>
              )}

              {organization.description && (
                <div className={`mt-2 text-muted ${styles.description}`}>{organization.description}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="d-flex flex-row align-items-baseline text-truncate">
        <button
          className={`p-0 border-0 text-muted text-truncate flex-grow-1 bg-transparent position-relative ${styles.link} ${props.btnClassName}`}
          onClick={(e) => {
            e.preventDefault();
            navigate({
              pathname: '/packages/search',
              search: prepareQueryString({
                pageNumber: 1,
                filters: {
                  org: [props.organizationName!],
                },
                deprecated: props.deprecated,
              }),
            });
          }}
          onMouseEnter={(e) => {
            e.preventDefault();
            setOnLinkHover(true);
            openOrgInfo();
          }}
          onMouseLeave={() => {
            setFetchTimeout(null);
            cleanFetchTimeout();
            setOnLinkHover(false);
          }}
          aria-label="Organization info"
          aria-expanded={openStatus}
          aria-hidden="true"
          tabIndex={-1}
        >
          <div className="d-flex flex-row align-items-baseline">
            {props.visibleLegend && (
              <div className={`d-flex flex-row align-items-baseline me-1 text-dark position-relative ${styles.icon}`}>
                <MdBusiness />
              </div>
            )}
            <div
              className={classnames({
                'text-truncate': isUndefined(props.multiLine) || !props.multiLine,
              })}
            >
              {props.organizationDisplayName || props.organizationName}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default OrganizationInfo;
