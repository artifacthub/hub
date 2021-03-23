import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { RepositoryKind } from '../../types';
import { RepoKindDef, REPOSITORY_KINDS } from '../../utils/data';
import prepareQueryString from '../../utils/prepareQueryString';
import styles from './RepositoryIconLabel.module.css';

interface Props {
  kind: RepositoryKind;
  isPlural?: boolean;
  className?: string;
  iconClassName?: string;
  noBackground?: boolean;
  clickable?: boolean;
}

const RepositoryIconLabel = (props: Props) => {
  const history = useHistory();
  const repo = REPOSITORY_KINDS.find((repoKind: RepoKindDef) => repoKind.kind === props.kind);

  if (isUndefined(repo)) return null;

  const label: JSX.Element = (
    <span
      className={classnames(
        {
          [`badge badge-light rounded-pill ${styles.bg}`]: isUndefined(props.noBackground) || !props.noBackground,
        },
        styles.badge,
        props.className
      )}
    >
      <div className="d-flex flex-row align-items-center">
        <div className={`position-relative ${styles.icon} ${props.iconClassName}`}>{repo.icon}</div>
        <div className="ml-1">{props.isPlural ? repo.plural : repo.singular}</div>
      </div>
    </span>
  );

  return (
    <>
      {!isUndefined(props.clickable) && props.clickable ? (
        <button
          data-testid="repoIconLabelLink"
          className="btn btn-link m-0 p-0"
          onClick={(e) => {
            e.preventDefault();
            history.push({
              pathname: '/packages/search',
              search: prepareQueryString({
                pageNumber: 1,
                filters: {
                  kind: [props.kind.toString()],
                },
              }),
            });
          }}
        >
          {label}
        </button>
      ) : (
        <>{label}</>
      )}
    </>
  );
};

export default RepositoryIconLabel;
