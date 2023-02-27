import moment from 'moment';
import { Link } from 'react-router-dom';

import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import isFuture from '../../utils/isFuture';
import Image from '../common/Image';
import RepositoryIcon from '../common/RepositoryIcon';
import RepositoryIconLabel from '../common/RepositoryIconLabel';
import RepositoryInfo from '../common/RepositoryInfo';
import StarBadge from '../common/StarBadge';
import styles from './BigRelatedPackageCard.module.css';

interface Props {
  package: Package;
}

const BigRelatedPackageCard = (props: Props) => {
  return (
    <div
      className={`card cardWithHover mt-3 mt-xxl-0 w-100 relatedCard bg-white ${styles.card}`}
      data-testid="relatedPackageLink"
    >
      <Link
        className={`text-decoration-none text-reset ${styles.link}`}
        to={{
          pathname: buildPackageURL(props.package.normalizedName, props.package.repository, props.package.version!),
        }}
      >
        <div className="card-body d-flex flex-column h-100 p-3">
          <div className="d-flex align-items-start justify-content-between mw-100">
            <div className={`d-flex align-items-stretch flex-grow-1 h-100 ${styles.truncateWrapper}`}>
              <div
                className={`position-relative d-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper}`}
              >
                <Image
                  imageId={props.package.logoImageId}
                  alt={`Logo ${props.package.displayName || props.package.name}`}
                  className={styles.image}
                  kind={props.package.repository.kind}
                />
              </div>

              <div
                className={`d-flex flex-column justify-content-between ms-3 flex-grow-1 ${styles.truncateWrapper} ${styles.titleWrapper}`}
              >
                <div className="text-truncate card-title mb-0">
                  <div className="d-flex flex-row align-items-center">
                    <div className={`text-truncate ${styles.title}`}>
                      {props.package.displayName || props.package.name}
                    </div>
                  </div>
                </div>

                <div className={`card-subtitle align-items-baseline ${styles.subtitle}`}>
                  <div className="d-flex flex-row align-items-baseline">
                    <div className="text-left w-auto mw-100">
                      <RepositoryInfo
                        repository={props.package.repository}
                        className={`d-flex flex-row align-items-baseline ${styles.truncateWrapper}`}
                        repoLabelClassName="d-none d-lg-inline"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`d-flex flex-column align-items-end mb-auto ms-2`}>
                <div className={`align-self-start d-flex align-items-center text-uppercase ms-auto ${styles.kind}`}>
                  <StarBadge className="me-2" starsNumber={props.package.stars} />
                  <RepositoryIconLabel kind={props.package.repository.kind} clickable className="d-none d-sm-block" />
                  <div className="d-block d-sm-none">
                    <RepositoryIcon kind={props.package.repository.kind} className={styles.kindIcon} />
                  </div>
                </div>
                <div className="d-none d-md-block mt-1">
                  {!isFuture(props.package.ts) && (
                    <small className={`text-muted text-nowrap ${styles.date}`}>
                      Updated {moment.unix(props.package.ts).fromNow()}
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default BigRelatedPackageCard;
