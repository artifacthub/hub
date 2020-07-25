import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useRef, useState } from 'react';
import { MdInfo } from 'react-icons/md';
import { useHistory } from 'react-router-dom';

import useOutsideClick from '../../hooks/useOutsideClick';
import { Repository } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import ButtonCopyToClipboard from './ButtonCopyToClipboard';
import RepositoryIcon from './RepositoryIcon';
import styles from './RepositoryInfo.module.css';

interface Props {
  repository: Repository;
  deprecated: boolean | null;
  className?: string;
  fromDetail?: boolean;
  visibleIcon?: boolean;
}

const RepositoryInfo = (props: Props) => {
  const history = useHistory();
  const ref = useRef(null);
  const [openStatus, setOpenStatus] = useState(false);
  const [onLinkHover, setOnLinkHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  useEffect(() => {
    if (!openStatus && (onLinkHover || onDropdownHover)) {
      setOpenStatus(true);
    }
    if (openStatus && !onLinkHover && !onDropdownHover) {
      setTimeout(() => {
        // Delay to hide the dropdown to avoid hide it if user changes from link to dropdown
        setOpenStatus(false);
      }, 50);
    }
  }, [onLinkHover, onDropdownHover, openStatus]);

  return (
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
                <RepositoryIcon kind={props.repository.kind} className={`mr-1 ${styles.repoIconMini}`} />
                <div className={`text-reset ${styles.labelContent}`}>
                  {props.repository.displayName || props.repository.name}
                </div>
              </div>

              <div className="mt-2 d-flex flex-row align-items-baseline">
                <small className="text-muted text-uppercase mr-1">Url: </small>
                <div className={`text-reset ${styles.urlContent} ${styles.labelContent}`}>
                  {props.repository.url}
                  <ButtonCopyToClipboard
                    text={props.repository.url}
                    className={styles.miniBtn}
                    wrapperClassName="d-inline-block"
                    arrowClassName={styles.arrow}
                    tooltipClassName="p-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-row aling-items-start text-truncate">
        <div className="d-flex flex-row align-items-start mr-1 text-muted text-uppercase">
          <small className="mr-1">Repo:</small>
          {!isUndefined(props.visibleIcon) && props.visibleIcon && (
            <RepositoryIcon kind={props.repository.kind} className={styles.repoIcon} />
          )}
        </div>

        <button
          data-testid="repoLink"
          className={`p-0 border-0 text-dark text-truncate ${styles.link}`}
          onClick={(e) => {
            e.preventDefault();
            history.push({
              pathname: '/packages/search',
              search: prepareQueryString({
                pageNumber: 1,
                filters: {
                  repo: [props.repository.name],
                },
                deprecated: props.deprecated,
              }),
              state: !isUndefined(props.fromDetail) && props.fromDetail ? { fromDetail: true } : {},
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
          <div className="text-truncate">{props.repository.displayName || props.repository.name}</div>
        </button>
        {!isUndefined(props.repository.url) && !isUndefined(props.fromDetail) && props.fromDetail && (
          <MdInfo className={`d-none d-sm-block ml-1 ${styles.infoIcon}`} />
        )}
      </div>
    </div>
  );
};

export default RepositoryInfo;
