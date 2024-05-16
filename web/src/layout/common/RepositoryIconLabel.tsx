import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { useNavigate } from 'react-router-dom';

import { RepositoryKind } from '../../types';
import { RepoKindDef, REPOSITORY_KINDS } from '../../utils/data';
import { prepareQueryString } from '../../utils/prepareQueryString';
import styles from './RepositoryIconLabel.module.css';

interface Props {
  kind: RepositoryKind;
  isPlural?: boolean;
  className?: string;
  btnClassName?: string;
  iconClassName?: string;
  noBackground?: boolean;
  clickable?: boolean;
  deprecated?: boolean | null;
}

const RepositoryIconLabel = (props: Props) => {
  const navigate = useNavigate();
  const repo = REPOSITORY_KINDS.find((repoKind: RepoKindDef) => repoKind.kind === props.kind);

  if (isUndefined(repo)) return null;

  const label: JSX.Element = (
    <span
      className={classnames(
        {
          [`badge bg-light text-dark border border-1 ${styles.bg}`]:
            isUndefined(props.noBackground) || !props.noBackground,
        },
        styles.badge,
        props.className
      )}
    >
      <div className="d-flex flex-row align-items-center">
        <div className={`position-relative ${styles.icon} ${props.iconClassName}`} aria-hidden="true">
          {repo.icon}
        </div>
        <div className={`ms-1 ${styles.text}`}>{props.isPlural ? repo.plural : repo.singular}</div>
      </div>
    </span>
  );

  return (
    <>
      <div className="d-none d-md-inline-block">
        {!isUndefined(props.clickable) && props.clickable ? (
          <>
            <span className="visually-hidden">{props.isPlural ? repo.plural : repo.singular}</span>

            <button
              data-testid="repoIconLabelLink"
              className={`btn btn-link m-0 p-0 border-0 ${styles.btn} ${props.btnClassName}`}
              onClick={(e) => {
                e.preventDefault();
                navigate({
                  pathname: '/packages/search',
                  search: prepareQueryString({
                    pageNumber: 1,
                    filters: {
                      kind: [props.kind.toString()],
                    },
                    deprecated: props.deprecated,
                  }),
                });
              }}
              aria-label={`Filter by ${props.isPlural ? repo.plural : repo.singular} repository kind`}
              aria-hidden="true"
              tabIndex={-1}
            >
              {label}
            </button>
          </>
        ) : (
          <div className="d-flex fs-6">{label}</div>
        )}
      </div>
      <div className="d-flex d-md-none fs-6">{label}</div>
    </>
  );
};

export default RepositoryIconLabel;
