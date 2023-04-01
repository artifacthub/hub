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
    className="d-inline-block text-dark h5 mb-2 me-3"
    to={{
      pathname: props.recommendation.url,
    }}
  >
    <div
      className={`badge bg-light text-dark d-flex flex-row align-items-center ps-0 pe-3 border border-1 ${styles.badge}`}
    >
      <div className="me-2">
        <div className={`${styles.imageWrapper} ms-1 overflow-hidden`}>
          <div className="d-flex align-items-center justify-content-center w-100 h-100">
            <RepositoryIcon kind={props.recommendation.kind} className={styles.image} />
          </div>
        </div>
      </div>

      <div className={`text-truncate text-dark fw-bold ${styles.badgeContent}`}>
        <span>{props.recommendation.normalizedName}</span>
      </div>
    </div>
  </Link>
);

export default RecommendedPackageCard;
