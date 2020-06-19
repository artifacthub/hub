import { isNull, isUndefined } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { Package, PackageKind } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import OrganizationInfo from './OrganizationInfo';
import styles from './PackageCardGeneralInfo.module.css';

interface Props {
  package: Package;
}

const PackageCardGeneralInfo = (props: Props) => {
  const history = useHistory();

  const isRepeatedRepoName = (): boolean => {
    if (props.package.kind !== PackageKind.Chart || !isNull(props.package.userAlias)) return false;
    return (
      (props.package.chartRepository!.displayName || props.package.chartRepository!.name) ===
      (props.package.organizationDisplayName || props.package.organizationName)
    );
  };

  return (
    <div className={`card-subtitle d-flex flex-nowrap ${styles.subtitle}`}>
      <div className="d-inline-block d-md-none text-truncate w-100">
        <span className={`text-dark d-inline-block text-truncate mw-100 ${styles.mobileVersion}`}>
          {!isRepeatedRepoName() && isNull(props.package.userAlias) && (
            <>{props.package.organizationDisplayName || props.package.organizationName}</>
          )}
          {!isNull(props.package.userAlias) && <>{props.package.userAlias}</>}
          {(() => {
            switch (props.package.kind) {
              case PackageKind.Chart:
                return (
                  <>
                    {(!isNull(props.package.userAlias) || !isRepeatedRepoName()) && <span className="px-1">/</span>}
                    {props.package.chartRepository!.displayName || props.package.chartRepository!.name}
                  </>
                );
              default:
                return null;
            }
          })()}
        </span>
      </div>

      <div className={`d-none d-md-flex flex-row align-items-baseline w-100 ${styles.wrapper}`}>
        {!isUndefined(props.package.organizationName) && props.package.organizationName && !isRepeatedRepoName() && (
          <OrganizationInfo
            className="mr-2 d-flex flex-row align-items-baseline"
            btnClassName={`text-truncate ${styles.buttonWithEllipsis}`}
            organizationName={props.package.organizationName}
            organizationDisplayName={props.package.organizationDisplayName}
            deprecated={props.package.deprecated}
            visibleLegend
          />
        )}

        {!isNull(props.package.userAlias) && (
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
                      user: [props.package.userAlias!],
                    },
                    deprecated: isNull(props.package.deprecated) ? false : props.package.deprecated,
                  }),
                });
              }}
            >
              {props.package.userAlias}
            </button>
          </div>
        )}

        {(() => {
          switch (props.package.kind) {
            case PackageKind.Chart:
              return (
                <>
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
                              repo: [props.package.chartRepository!.name],
                            },
                            deprecated: isNull(props.package.deprecated) ? false : props.package.deprecated,
                          }),
                        });
                      }}
                    >
                      {props.package.chartRepository!.displayName || props.package.chartRepository!.name}
                    </button>
                  </div>

                  <div className={`text-truncate d-none d-md-inline ${styles.versions}`}>
                    <span className="text-muted text-uppercase mr-1">Version: </span>
                    {props.package.version || '-'}
                    <div className="d-none d-lg-inline">
                      <span className="text-muted text-uppercase mr-1 ml-2">App version: </span>
                      {props.package.appVersion || '-'}
                    </div>
                  </div>
                </>
              );

            case PackageKind.Falco:
            case PackageKind.Opa:
              return (
                <div className="text-truncate d-none d-md-inline">
                  <span className="text-muted text-uppercase mr-1">Version: </span>
                  {props.package.version || '-'}
                </div>
              );

            default:
              return null;
          }
        })()}
      </div>
    </div>
  );
};

export default PackageCardGeneralInfo;
