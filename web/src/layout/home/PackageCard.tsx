import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import React from 'react';
import { FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import prettifyNumber from '../../utils/prettifyNumber';
import Image from '../common/Image';
import PackageCardGeneralInfo from '../common/PackageCardGeneralInfo';
import PackageIcon from '../common/PackageIcon';
import styles from './PackageCard.module.css';

interface Props {
  package: Package;
}

const PackageCard = (props: Props) => (
  <div className={`position-relative mw-100 ${styles.card}`}>
    <div className={`card-body d-flex flex-column ${styles.body}`}>
      <div className="d-flex align-items-stretch justify-content-between flex-grow-1 mw-100">
        <Link
          className={`text-decoration-none m-auto ${styles.link}`}
          to={{
            pathname: buildPackageURL(props.package),
          }}
        >
          <div
            className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}
          >
            <Image
              imageId={props.package.logoImageId}
              alt={`Logo ${props.package.displayName || props.package.name}`}
              className={styles.image}
            />
          </div>
        </Link>

        <div
          className={`d-flex flex-column justify-content-around my-0 my-md-2 ml-3 flex-grow-1 ${styles.truncateWrapper}`}
        >
          <div className={`text-truncate card-title mb-0 font-weight-bolder ${styles.title}`}>
            <Link
              data-testid="packageLink"
              className={styles.link}
              to={{
                pathname: buildPackageURL(props.package),
              }}
            >
              <div className="h6 text-truncate mr-2">{props.package.displayName || props.package.name}</div>
            </Link>
          </div>

          <PackageCardGeneralInfo package={props.package} />
        </div>

        <div className="d-flex flex-column align-items-end mb-auto ml-3">
          <small className={`d-none d-sm-block text-muted mb-2 text-nowrap ${styles.date}`}>
            Updated {moment(props.package.createdAt * 1000).fromNow()}
          </small>
          <div className={`align-self-start d-flex align-items-center text-uppercase ml-auto ${styles.kind}`}>
            {!isUndefined(props.package.stars) && !isNull(props.package.stars) && (
              <span className={`badge badge-pill badge-light mr-2 ${styles.starBadge}`}>
                <div className="d-flex align-items-center">
                  <FaStar className="mr-1" />
                  <div>{prettifyNumber(props.package.stars)}</div>
                </div>
              </span>
            )}
            <PackageIcon className={styles.icon} kind={props.package.kind} />
          </div>
        </div>
      </div>
      <div className="mt-3">{props.package.description}</div>

      <small className={`d-block d-sm-none text-muted text-nowrap text-right mt-3 ${styles.date}`}>
        Updated {moment(props.package.createdAt * 1000).fromNow()}
      </small>
    </div>
  </div>
);

export default PackageCard;
