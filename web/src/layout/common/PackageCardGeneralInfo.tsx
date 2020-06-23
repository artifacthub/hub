import { isNull, isUndefined } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { Package, RepositoryKind } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import OrganizationInfo from './OrganizationInfo';
import styles from './PackageCardGeneralInfo.module.css';

interface Props {
  package: Package;
}

const PackageCardGeneralInfo = (props: Props) => {
  const history = useHistory();

  const isRepeatedRepoName = (): boolean => {
    return (
      (props.package.repository.displayName || props.package.repository.name) ===
      (props.package.repository.userAlias ||
        props.package.repository.organizationDisplayName ||
        props.package.repository.organizationName)
    );
  };

  return (
    <div className={`card-subtitle d-flex flex-nowrap ${styles.subtitle}`}>
      <div className="d-inline-block d-md-none text-truncate w-100">
        <span className={`text-dark d-inline-block text-truncate mw-100 ${styles.mobileVersion}`}>
          {!isRepeatedRepoName() && (
            <>
              {props.package.repository.userAlias ||
                props.package.repository.organizationDisplayName ||
                props.package.repository.organizationName}
              <span className="px-1">/</span>
            </>
          )}
          {props.package.repository.displayName || props.package.repository.name}
        </span>
      </div>

      <div className={`d-none d-md-flex flex-row align-items-baseline w-100 ${styles.wrapper}`}>
        {!isUndefined(props.package.repository.organizationName) &&
          props.package.repository.organizationName &&
          !isRepeatedRepoName() && (
            <OrganizationInfo
              className="mr-2 d-flex flex-row align-items-baseline"
              btnClassName={`text-truncate ${styles.buttonWithEllipsis}`}
              organizationName={props.package.repository.organizationName}
              organizationDisplayName={props.package.repository.organizationDisplayName}
              deprecated={props.package.deprecated}
              visibleLegend
            />
          )}
        {!isNull(props.package.repository.userAlias) && (
          <div className="mr-2 text-truncate d-flex flex-row align-items-baseline">
            <span className="text-muted text-uppercase mr-1">User:</span>
            <button
              data-testid="userLink"
              className={`d-none d-md-inline-block p-0 border-0 text-dark text-truncate flex-grow-1 mw-100 ${styles.link}`}
              onClick={(e) => {
                e.preventDefault();
                history.push({
                  pathname: '/packages/search',
                  search: prepareQueryString({
                    pageNumber: 1,
                    filters: {
                      user: [props.package.repository.userAlias!],
                    },
                    deprecated: isNull(props.package.deprecated) ? false : props.package.deprecated,
                  }),
                });
              }}
            >
              {props.package.repository.userAlias}
            </button>
          </div>
        )}

        <div className="mr-2 text-truncate align-items-baseline d-flex flex-row">
          <span className="text-muted text-uppercase mr-1">Repo:</span>
          <button
            data-testid="repoLink"
            className={`p-0 border-0 text-dark text-truncate flex-grow-1 mw-100 ${styles.link}`}
            onClick={(e) => {
              e.preventDefault();
              history.push({
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: 1,
                  filters: {
                    repo: [props.package.repository.name],
                  },
                  deprecated: isNull(props.package.deprecated) ? false : props.package.deprecated,
                }),
              });
            }}
          >
            {props.package.repository.displayName || props.package.repository.name}
          </button>
        </div>

        <div className={`text-truncate d-none d-md-inline ${styles.versions}`}>
          <span className="text-muted text-uppercase mr-1">Version: </span>
          {props.package.version || '-'}
          {(() => {
            switch (props.package.repository.kind) {
              case RepositoryKind.Helm:
                return (
                  <div className="d-none d-lg-inline">
                    <span className="text-muted text-uppercase mr-1 ml-2">App version: </span>
                    {props.package.appVersion || '-'}
                  </div>
                );

              default:
                return null;
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default PackageCardGeneralInfo;
