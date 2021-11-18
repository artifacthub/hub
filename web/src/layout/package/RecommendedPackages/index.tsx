import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import { GoPackage } from 'react-icons/go';

import { Recommendation, RecommendedPackage, RepositoryKind } from '../../../types';
import { getRepoKind } from '../../../utils/repoKind';
import RecommendedPackageCard from './Card';
import styles from './RecommendedPackages.module.css';

interface Props {
  recommendations?: Recommendation[];
  className?: string;
}

const URL_regex = /^https:\/\/([^\/?]+)\/packages\/([a-z-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)$/; // eslint-disable-line

const prepareRecommendations = (recommendations?: Recommendation[]): RecommendedPackage[] => {
  let list: RecommendedPackage[] = [];

  if (!isUndefined(recommendations)) {
    recommendations.forEach((recommendation: Recommendation) => {
      const match = recommendation.url.match(URL_regex);
      if (match) {
        const repoKind: RepositoryKind | null = getRepoKind(match[2]);
        if (!isNull(repoKind)) {
          list.push({
            url: `/packages/${match[2]}/${match[3]}/${match[4]}`,
            kind: repoKind,
            normalizedName: match[4],
            repoName: match[3],
          });
        }
      }
    });
  }

  return list;
};

const RecommendedPackages = (props: Props) => {
  const [recommendations, setRecommendations] = useState<RecommendedPackage[]>(
    prepareRecommendations(props.recommendations)
  );
  useEffect(() => {
    const cleanRecommendations = prepareRecommendations(props.recommendations);
    setRecommendations(cleanRecommendations);
  }, [props.recommendations]);

  if (recommendations.length === 0) return null;

  return (
    <div className={`w-100 ${props.className}`}>
      <div className="w-100 text-nowrap mb-2">
        <span className={`position-relative ${styles.pkgIcon}`}>
          <GoPackage />
        </span>
        <small className="text-muted ml-2">Other packages recommended by the publisher:</small>
        <small className="text-dark font-weight-bold ml-2">{recommendations.length}</small>
      </div>

      <div className={`d-flex flex-column pb-3 pt-1 ${styles.content}`}>
        <div className={`position-relative w-100 overflow-hidden ${styles.content}`}>
          <div className="w-100">
            {recommendations.map((pkg: RecommendedPackage) => (
              <RecommendedPackageCard key={`recommended_${pkg.normalizedName}`} recommendation={pkg} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RecommendedPackages);
