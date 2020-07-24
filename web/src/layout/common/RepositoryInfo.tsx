import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { MdInfo } from 'react-icons/md';
import { useHistory } from 'react-router-dom';

import { Repository } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
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
  return (
    <div className={`text-truncate ${props.className} ${styles.wrapper}`}>
      <div className="position-absolute">
        {!isUndefined(props.repository.url) && (
          <div className={`d-none d-sm-block dropdown-menu dropdown-menu-left ${styles.dropdown}`} role="tooltip">
            <div className={styles.content}>
              <div className="mt-1 d-flex flex-row align-items-baseline">
                <span className="text-muted text-uppercase mr-1">REPO: </span>
                <RepositoryIcon kind={props.repository.kind} className={`mr-1 ${styles.repoIcon}`} />
                {props.repository.displayName || props.repository.name}
              </div>
              <div className="mt-1 d-flex flex-row align-items-baseline">
                <span className="text-muted text-uppercase mr-1">URL: </span>
                {props.repository.url || props.repository.name}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`d-flex flex-row aling-items-start text-truncate `}>
        <small className="mr-1 text-muted text-uppercase">Repo:</small>
        {!isUndefined(props.visibleIcon) && props.visibleIcon && (
          <RepositoryIcon kind={props.repository.kind} className={`mr-1 ${styles.repoIcon}`} />
        )}
        <button
          data-testid="repoLink"
          className={`text-truncate flex-grow-1 p-0 border-0 text-dark mw-100 ${styles.link}`}
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
        >
          <div className="d-flex flex-row align-items-center">
            <div className="text-truncate">{props.repository.displayName || props.repository.name}</div>
            {!isUndefined(props.repository.url) && <MdInfo className={`d-none d-sm-block ml-1 ${styles.infoIcon}`} />}
          </div>
        </button>
      </div>
    </div>
  );
};

export default RepositoryInfo;
