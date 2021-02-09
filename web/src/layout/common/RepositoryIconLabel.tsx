import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React from 'react';

import { RepositoryKind } from '../../types';
import { RepoKindDef, REPOSITORY_KINDS } from '../../utils/data';
import styles from './RepositoryIconLabel.module.css';

interface Props {
  kind: RepositoryKind;
  isPlural?: boolean;
  className?: string;
  iconClassName?: string;
  noBackground?: boolean;
}

const RepositoryIconLabel = (props: Props) => {
  const repo = REPOSITORY_KINDS.find((repoKind: RepoKindDef) => repoKind.kind === props.kind);

  if (isUndefined(repo)) return null;

  return (
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
};

export default RepositoryIconLabel;
