import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import React from 'react';
import { FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { Package, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import prettifyNumber from '../../utils/prettifyNumber';
import Image from './Image';
import styles from './PackageCard.module.css';
import PackageCardGeneralInfo from './PackageCardGeneralInfo';
import PackageIcon from './PackageIcon';
import SignedBadge from './SignedBadge';

interface Props {
  package: Package;
  saveScrollPosition?: () => void;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  visibleSignedBadge?: boolean;
}

const PackageCard = (props: Props) => (
  <div className="col-12 py-sm-3 py-2" role="listitem">
    <div className={`card h-100 ${styles.card}`}>
      <Link
        data-testid="link"
        className={`text-decoration-none ${styles.link}`}
        onClick={() => {
          if (!isUndefined(props.saveScrollPosition)) {
            props.saveScrollPosition();
          }
        }}
        to={{
          pathname: buildPackageURL(props.package),
          state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
        }}
      >
        <div className={`card-body d-flex flex-column ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between mb-3 flex-grow-1 mw-100">
            <div className={`d-flex align-self-stretch flex-grow-1 ${styles.truncateWrapper}`}>
              <div
                className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}
              >
                <Image
                  imageId={props.package.logoImageId}
                  alt={`Logo ${props.package.displayName || props.package.name}`}
                  className={styles.image}
                />
              </div>

              <div className={`mx-3 d-flex flex-column justify-content-around flex-grow-1 ${styles.truncateWrapper}`}>
                <div className={`card-title font-weight-bolder mb-0 text-truncate ${styles.title}`}>
                  <div className="h5 mb-0 d-flex flex-row align-items-center">
                    <div className="text-truncate">{props.package.displayName || props.package.name}</div>

                    {!isNull(props.package.deprecated) && props.package.deprecated && (
                      <div
                        className={`d-none d-sm-flex badge badge-pill ml-3 mt-1 text-uppercase ${styles.deprecatedBadge}`}
                      >
                        Deprecated
                      </div>
                    )}
                    {!isUndefined(props.visibleSignedBadge) && props.visibleSignedBadge && (
                      <SignedBadge signed={props.package.signed} />
                    )}
                  </div>
                </div>

                <PackageCardGeneralInfo package={props.package} />
              </div>

              <div className="d-flex flex-column mb-auto">
                <small className={`d-none d-lg-block text-muted text-nowrap mb-2 ${styles.date}`}>
                  Updated {moment(props.package.createdAt * 1000).fromNow()}
                </small>
                <div className={`d-flex align-items-start text-uppercase ml-auto ${styles.kind}`}>
                  {!isUndefined(props.package.stars) && !isNull(props.package.stars) && (
                    <span className={`badge badge-pill badge-light mr-2 ${styles.starBadge}`}>
                      <div className="d-flex align-items-center">
                        <FaStar className="mr-1" />
                        <div className={styles.starBadgeNumber}>{prettifyNumber(props.package.stars)}</div>
                      </div>
                    </span>
                  )}
                  <PackageIcon className={styles.icon} kind={props.package.kind} />
                </div>
              </div>
            </div>
          </div>

          <p className={`mb-0 card-text overflow-hidden ${styles.description}`}>{props.package.description}</p>

          <small className={`d-block d-lg-none text-muted text-nowrap text-right mt-3 ${styles.date}`}>
            Updated {moment(props.package.createdAt * 1000).fromNow()}
          </small>

          {!isNull(props.package.deprecated) && props.package.deprecated && (
            <div className={`d-inline d-sm-none badge badge-pill mt-1 text-uppercase ${styles.deprecatedBadge}`}>
              Deprecated
            </div>
          )}
        </div>
      </Link>
    </div>
  </div>
);

export default PackageCard;
