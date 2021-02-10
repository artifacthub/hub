import React from 'react';
import { Link } from 'react-router-dom';

import { RecommendedPackage } from '../../../types';
import RepositoryIconLabel from '../../common/RepositoryIconLabel';
import styles from './RecommendedPackageCard.module.css';

interface Props {
  recommendation: RecommendedPackage;
}

const RecommendedPackageCard = (props: Props) => (
  <Link
    data-testid="recommended-pkg"
    className="d-inline-block text-decoration-none text-dark h5 mb-2 mr-3"
    to={{
      pathname: props.recommendation.url,
    }}
  >
    <div className="badge badge-rounded badge-light rounded-pill d-flex flex-row border align-items-center py-2 px-3">
      <div className={`position-relative mr-3 ${styles.iconKind} ${styles.separator}`}>
        <RepositoryIconLabel kind={props.recommendation.kind} noBackground />
      </div>

      <div className={`ml-3 text-truncate ${styles.badgeContent}`}>
        <span className="mr-3 font-weight-bold">{props.recommendation.normalizedName}</span>
        <small className="text-muted">REPO:</small> <span>{props.recommendation.repoName}</span>
      </div>
    </div>
  </Link>
);

export default RecommendedPackageCard;
