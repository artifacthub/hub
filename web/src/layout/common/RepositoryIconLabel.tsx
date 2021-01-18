import { isUndefined } from 'lodash';
import React from 'react';

import { RepositoryKind } from '../../types';
import { RepoKindDef, REPOSITORY_KINDS } from '../../utils/data';
import styles from './RepositoryIconLabel.module.css';

interface Props {
  kind: RepositoryKind;
  isPlural?: boolean;
  className?: string;
}

const RepositoryIconLabel = (props: Props) => {
  const repo = REPOSITORY_KINDS.find((repoKind: RepoKindDef) => repoKind.kind === props.kind);

  if (isUndefined(repo)) return null;

  return (
    <span className={`badge badge-light rounded-pill ${styles.badge} ${props.className}`}>
      <div className="d-flex flex-arow align-items-center">
        <div className={`position-relative ${styles.icon}`}>{repo.icon}</div>
        <div className="ml-1">{props.isPlural ? repo.plural : repo.singular}</div>
      </div>
    </span>
  );
};

export default React.memo(RepositoryIconLabel);
