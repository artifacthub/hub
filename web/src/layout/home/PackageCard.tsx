import React from 'react';
import { Link, useHistory } from 'react-router-dom';
import Image from '../common/Image';
import PackageIcon from '../common/PackageIcon';
import { Package, PackageKind } from '../../types';
import styles from './PackageCard.module.css';
import prepareQueryString from '../../utils/prepareQueryString';
import buildPackageURL from '../../utils/buildPackageURL';

interface Props {
  package: Package;
}

const PackageCard = (props: Props) => {
  const history = useHistory();

  return (
    <div className={`card mb-3 mw-100 ${styles.card}`}>
      <Link
        className={`text-decoration-none ${styles.link}`}
        to={{
          pathname: buildPackageURL(props.package),
        }}
      >
        <div className={`card-body d-flex ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between flex-grow-1">
            <div className={`d-flex align-items-center flex-grow-1 h-100 ${styles.truncateWrapper}`}>
              <div className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}>
                <Image
                  imageId={props.package.logoImageId}
                  alt={`Logo ${props.package.displayName || props.package.name}`}
                  className={styles.image}
                />
              </div>

              <div className={`ml-3 flex-grow-1 ${styles.truncateWrapper}`}>
                <div className={`card-title font-weight-bolder ${styles.title}`}>
                  <div className="h6 text-truncate">
                    {props.package.displayName || props.package.name}
                  </div>
                </div>

                <div className={`card-subtitle align-items-center ${styles.subtitle}`}>
                  {(() => {
                    switch (props.package.kind) {
                      case PackageKind.Chart:
                        return (
                          <>
                            <div className="mr-2 text-truncate">
                              <span className="text-muted text-uppercase mr-1">Repository: </span>
                              <button
                                className={`p-0 border-0 ${styles.link}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  history.push({
                                    pathname: '/search',
                                    search: prepareQueryString({
                                      pageNumber: 1,
                                      filters: {
                                        'repo': [props.package.chartRepository!.name],
                                      },
                                      deprecated: false,
                                    }),
                                  });
                                }}
                              >
                                <u>{props.package.chartRepository!.displayName || props.package.chartRepository!.name}</u>
                              </button>
                            </div>

                            <div className="text-truncate">
                              <span className="text-muted text-uppercase mr-1">Version: </span>
                              {props.package.appVersion || '-'}
                            </div>
                          </>
                        );

                      case PackageKind.Falco:
                      case PackageKind.Opa:
                        return (
                          <div className="text-truncate">
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
            </div>

            <div className={`d-flex align-items-center text-uppercase ml-2 ${styles.kind}`}>
              <PackageIcon className={styles.icon} kind={props.package.kind} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default PackageCard;
