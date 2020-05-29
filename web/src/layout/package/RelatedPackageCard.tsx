import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { Link } from 'react-router-dom';

import { Package, PackageKind } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import Image from '../common/Image';
import PackageIcon from '../common/PackageIcon';
import styles from './RelatedPackageCard.module.css';

interface Props {
  package: Package;
}

const RelatedPackageCard = (props: Props) => (
  <div className={`card mb-2 w-100 ${styles.card}`}>
    <Link
      data-testid="relatedPackageLink"
      className={`text-decoration-none ${styles.link}`}
      to={{
        pathname: buildPackageURL(props.package),
      }}
    >
      <div className={`card-body d-flex flex-column ${styles.body}`}>
        <div className="d-flex align-items-start justify-content-between flex-grow-1 mw-100">
          <div className={`d-flex align-items-center flex-grow-1 ${styles.truncateWrapper}`}>
            <div className={`d-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper}`}>
              <Image
                imageId={props.package.logoImageId}
                alt={`Logo ${props.package.displayName || props.package.name}`}
                className={styles.image}
              />
            </div>

            <div className={`ml-2 h-100 flex-grow-1 ${styles.truncateWrapper}`}>
              <div className="h-100 d-flex flex-row justify-content-between">
                <div className={`align-self-end text-truncate card-title mb-2 mr-2 ${styles.title}`}>
                  {props.package.displayName || props.package.name}
                </div>

                <div className={`align-self-start d-flex align-items-center text-uppercase ${styles.kind}`}>
                  <PackageIcon className={styles.icon} kind={props.package.kind} />
                </div>
              </div>

              <div className={`card-subtitle text-truncate h-50 align-items-center ${styles.subtitle}`}>
                {(() => {
                  switch (props.package.kind) {
                    case PackageKind.Chart:
                      return (
                        <>
                          <div className="d-flex flex-row align-items-baseline text-truncate">
                            <span className="text-muted text-uppercase mr-1">Repo: </span>
                            {!isUndefined(props.package.organizationName) && props.package.organizationName && (
                              <div className={`p-0 border-0 text-truncate text-dark ${styles.mx50}`}>
                                {props.package.organizationDisplayName || props.package.organizationName}
                              </div>
                            )}

                            {!isNull(props.package.userAlias) && (
                              <div className={`p-0 border-0 text-truncate text-dark ${styles.mx50}`}>
                                {props.package.userAlias}
                              </div>
                            )}

                            <span className="px-1">/</span>

                            <div className={`text-truncate p-0 border-0 text-dark ${styles.mx50}`}>
                              {props.package.chartRepository!.displayName || props.package.chartRepository!.name}
                            </div>
                          </div>
                        </>
                      );

                    case PackageKind.Falco:
                    case PackageKind.Opa:
                      return (
                        <>
                          {!isUndefined(props.package.organizationName) && props.package.organizationName && (
                            <>
                              <span className="text-muted text-uppercase mr-1">Org: </span>
                              <div className={`d-inline text-truncate text-dark ${styles.mx50}`}>
                                {props.package.organizationDisplayName || props.package.organizationName}
                              </div>
                            </>
                          )}

                          {!isNull(props.package.userAlias) && (
                            <div className="mr-2 text-truncate">
                              <span className="text-muted text-uppercase mr-1">User:</span>
                              <div className={`d-inline text-truncate text-dark ${styles.mx50}`}>
                                {props.package.userAlias}
                              </div>
                            </div>
                          )}
                        </>
                      );

                    default:
                      return null;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  </div>
);

export default RelatedPackageCard;
