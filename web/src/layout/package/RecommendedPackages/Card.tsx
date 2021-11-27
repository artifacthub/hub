import { Link } from 'react-router-dom';

import { RecommendedPackage } from '../../../types';
import RepositoryIcon from '../../common/RepositoryIcon';
import styles from './Card.module.css';

interface Props {
  recommendation: RecommendedPackage;
}

const RecommendedPackageCard = (props: Props) => (
  <Link
    data-testid="recommended-pkg"
    className="d-inline-block text-dark h5 mb-2 mr-3"
    to={{
      pathname: props.recommendation.url,
    }}
  >
    <div
      className={`badge badge-rounded badge-light rounded-pill d-flex flex-row align-items-center pl-0 pr-3 ${styles.badge}`}
    >
      <div className="mr-2">
        <div className={`${styles.imageWrapper} imageWrapper overflow-hidden`}>
          <div className="d-flex align-items-center justify-content-center w-100 h-100">
            <RepositoryIcon kind={props.recommendation.kind} className={styles.image} />
          </div>
        </div>
      </div>

      <div className={`text-truncate text-dark font-weight-bold ${styles.badgeContent}`}>
        <span>{props.recommendation.normalizedName}</span>
      </div>
    </div>
  </Link>
);

export default RecommendedPackageCard;
