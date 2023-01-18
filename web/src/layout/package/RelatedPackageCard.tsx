import { Link } from 'react-router-dom';

import { Repository } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import Image from '../common/Image';
import RepositoryIconLabel from '../common/RepositoryIconLabel';
import StarBadge from '../common/StarBadge';
import styles from './RelatedPackageCard.module.css';

interface Props {
  normalizedName: string;
  version: string;
  repository: Repository;
  name: string;
  displayName?: string | null;
  logoImageId?: string | null;
  stars?: number | null;
}

const RelatedPackageCard = (props: Props) => {
  return (
    <div className={`card cardWithHover mt-2 w-100 relatedCard ${styles.card}`} role="listitem">
      <Link
        data-testid="relatedPackageLink"
        className={`text-decoration-none text-reset bg-transparent ${styles.link}`}
        to={{
          pathname: buildPackageURL(props.normalizedName, props.repository, props.version),
        }}
      >
        <div className={`card-body d-flex flex-column ${styles.body}`}>
          <div className={`d-flex align-items-center flex-grow-1 ${styles.truncateWrapper}`}>
            <div className={`d-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper}`}>
              <Image
                imageId={props.logoImageId}
                alt={`Logo ${props.displayName || props.name}`}
                className={styles.image}
                kind={props.repository.kind}
              />
            </div>

            <div className={`ms-2 h-100 flex-grow-1 ${styles.truncateWrapper}`}>
              <div className="d-flex flex-row justify-content-between">
                <div className="text-truncate w-100">
                  <div className={`d-flex flex-row align-items-center justify-content-between ${styles.legend}`}>
                    <RepositoryIconLabel
                      kind={props.repository.kind}
                      className={`fw-bold ${styles.badge}`}
                      iconClassName={styles.badgeIcon}
                      noBackground
                    />
                    <StarBadge starsNumber={props.stars} size="xs" className={styles.starBadge} />
                  </div>
                  <div className={`align-self-end text-truncate card-title mb-2 ${styles.title}`}>
                    {props.displayName || props.name}
                  </div>
                  <div className={`card-subtitle align-items-center text-muted ${styles.subtitle}`}>
                    <div className="w-100">
                      <div className="text-truncate">{props.repository.displayName || props.repository.name}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default RelatedPackageCard;
