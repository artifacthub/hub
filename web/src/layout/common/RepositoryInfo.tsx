import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';
import { FiPackage } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import useOutsideClick from '../../hooks/useOutsideClick';
import { Repository } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import AttachedIconToText from './AttachedIconToText';
import ButtonCopyToClipboard from './ButtonCopyToClipboard';
import RepositoryIcon from './RepositoryIcon';
import styles from './RepositoryInfo.module.css';

interface Props {
  repository: Repository;
  deprecated?: boolean | null;
  className?: string;
  repoLabelClassName?: string;
}

const RepositoryInfo = (props: Props) => {
  const navigate = useNavigate();
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
            role="complementary"
            className={classnames('dropdown-menu dropdown-menu-left text-wrap', styles.dropdown, {
              show: openStatus,
            })}
            onMouseEnter={() => setOnDropdownHover(true)}
            onMouseLeave={() => setOnDropdownHover(false)}
          >
            <div className={styles.content}>
              <div className="d-flex flex-column">
                <div className="d-flex flex-row align-items-center">
                  <small className="text-muted text-uppercase me-1">Repo: </small>
                  <RepositoryIcon kind={props.repository.kind} className={`me-1 w-auto ${styles.repoIconMini}`} />
                  <div className={`text-reset text-truncate ${styles.labelContent}`}>
                    {props.repository.displayName || props.repository.name}
                  </div>
                </div>

                {!isUndefined(props.repository.url) && (
                  <div className="mt-2 d-flex flex-row align-items-baseline">
                    <small className="text-muted text-uppercase me-1">Url: </small>
                    <div data-testid="repoUrl" className={`text-reset text-break ${styles.labelContent}`}>
                      <AttachedIconToText
                        text={props.repository.url}
                        isVisible={openStatus}
                        icon={
                          <ButtonCopyToClipboard
                            text={props.repository.url}
                            className="bg-transparent"
                            wrapperClassName="d-inline"
                            arrowClassName={styles.arrow}
                            tooltipClassName="p-0"
                            label="Copy repository url to clipboard"
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

        <div className="d-flex flex-row align-items-baseline text-truncate">
          <div className="d-flex flex-row align-items-baseline me-1 text-dark text-uppercase">
            <div className={`position-relative ${styles.icon}`}>
              <FiPackage />
            </div>
          </div>
          <span className="visually-hidden">{props.repository.name}</span>

          <button
            data-testid="repoLink"
            className={classnames(
              'd-flex flex-row p-0 border-0 text-muted text-truncate bg-transparent position-relative',
              styles.link
            )}
            onClick={(e) => {
              e.preventDefault();
              navigate({
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: 1,
                  filters: {
                    repo: [props.repository.name],
                  },
                  deprecated: props.deprecated,
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
            aria-label={`Filter by repo ${props.repository.displayName || props.repository.name}`}
            aria-expanded={openStatus}
            aria-hidden="true"
            tabIndex={-1}
          >
            <>
              <div className="text-truncate">{props.repository.displayName || props.repository.name}</div>
            </>
          </button>
        </div>
      </div>
    </>
  );
};

export default RepositoryInfo;
