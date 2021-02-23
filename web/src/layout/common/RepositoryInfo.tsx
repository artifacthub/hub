import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useRef, useState } from 'react';
import { MdInfoOutline } from 'react-icons/md';
import { useHistory } from 'react-router-dom';

import useOutsideClick from '../../hooks/useOutsideClick';
import { Package } from '../../types';
import isPackageOfficial from '../../utils/isPackageOfficial';
import prepareQueryString from '../../utils/prepareQueryString';
import AttachedIconToText from './AttachedIconToText';
import ButtonCopyToClipboard from './ButtonCopyToClipboard';
import OfficialBadge from './OfficialBadge';
import RepositoryIcon from './RepositoryIcon';
import RepositoryIconLabel from './RepositoryIconLabel';
import styles from './RepositoryInfo.module.css';
import VerifiedPublisherBadge from './VerifiedPublisherBadge';

interface Props {
  package: Package;
  className?: string;
  repoLabelClassName?: string;
  visibleInfoIcon?: boolean;
  visibleIcon?: boolean;
  withLabels: boolean;
}

const RepositoryInfo = (props: Props) => {
  const history = useHistory();
  const ref = useRef(null);
  const [openStatus, setOpenStatus] = useState(false);
  const [onLinkHover, setOnLinkHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!openStatus && (onLinkHover || onDropdownHover)) {
      timeout = setTimeout(() => {
        setOpenStatus(true);
      }, 100);
    }
    if (openStatus && !onLinkHover && !onDropdownHover) {
      timeout = setTimeout(() => {
        // Delay to hide the dropdown to let some time for changing between dropdown and link (for copying text)
        setOpenStatus(false);
      }, 50);
    }
    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
    };
  }, [onLinkHover, onDropdownHover, openStatus]);

  return (
    <>
      <div className={props.className}>
        <div className="position-absolute">
          <div
            ref={ref}
            data-testid="repoInfoDropdown"
            className={classnames('dropdown-menu dropdown-menu-left', styles.dropdown, {
              show: openStatus,
            })}
            onMouseEnter={() => setOnDropdownHover(true)}
            onMouseLeave={() => setOnDropdownHover(false)}
          >
            <div className={styles.content}>
              <div className="d-flex flex-column">
                <div className="d-flex flex-row align-items-center">
                  <small className="text-muted text-uppercase mr-1">Repo: </small>
                  <RepositoryIcon kind={props.package.repository.kind} className={`mr-1 ${styles.repoIconMini}`} />
                  <div className={`text-reset text-truncate ${styles.labelContent}`}>
                    {props.package.repository.displayName || props.package.repository.name}
                  </div>
                </div>

                {!isUndefined(props.package.repository.url) && (
                  <div className="mt-2 d-flex flex-row align-items-baseline">
                    <small className="text-muted text-uppercase mr-1">Url: </small>
                    <div data-testid="repoUrl" className={`text-reset ${styles.urlContent} ${styles.labelContent}`}>
                      <AttachedIconToText
                        text={props.package.repository.url}
                        isVisible={openStatus}
                        icon={
                          <ButtonCopyToClipboard
                            text={props.package.repository.url}
                            className={styles.miniBtn}
                            wrapperClassName="d-inline"
                            arrowClassName={styles.arrow}
                            tooltipClassName="p-0"
                          />
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex flex-row aling-items-baseline text-truncate">
          <div className="d-flex flex-row align-items-baseline mr-1 text-muted text-uppercase">
            <small>Repo:</small>
            {props.visibleIcon && <RepositoryIconLabel kind={props.package.repository.kind} className="ml-1" />}
          </div>

          <button
            data-testid="repoLink"
            className={`d-flex flex-row p-0 border-0 text-dark text-truncate ${styles.link}`}
            onClick={(e) => {
              e.preventDefault();
              history.push({
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: 1,
                  filters: {
                    repo: [props.package.repository.name],
                  },
                  deprecated: props.package.deprecated,
                }),
              });
            }}
            onMouseEnter={(e) => {
              e.preventDefault();
              setOnLinkHover(true);
            }}
            onMouseLeave={() => {
              setOnLinkHover(false);
            }}
          >
            <>
              <div className="text-truncate">
                {props.package.repository.displayName || props.package.repository.name}
              </div>

              {props.package.repository.url && props.visibleInfoIcon && (
                <MdInfoOutline className={`d-none d-sm-inline-block ml-1 ${styles.infoIcon}`} />
              )}
            </>
          </button>
        </div>
      </div>
      {props.withLabels && (
        <>
          <OfficialBadge
            official={isPackageOfficial(props.package)}
            className={`ml-3 ${styles.repoLabel} ${props.repoLabelClassName}`}
            type="package"
          />
          <VerifiedPublisherBadge
            verifiedPublisher={props.package.repository.verifiedPublisher}
            className={`ml-3 ${styles.repoLabel} ${props.repoLabelClassName}`}
          />
        </>
      )}
    </>
  );
};

export default RepositoryInfo;
