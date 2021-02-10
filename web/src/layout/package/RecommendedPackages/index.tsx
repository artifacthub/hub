import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';

import { Recommendation, RecommendedPackage, RepositoryKind } from '../../../types';
import { getRepoKind } from '../../../utils/repoKind';
import RecommendedPackageCard from './Card';
import styles from './RecommendedPackages.module.css';

interface Props {
  recommendations?: Recommendation[];
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
    setRecommendations(prepareRecommendations(props.recommendations));
  }, [props.recommendations]);

  if (recommendations.length === 0) return null;

  return (
    <div className={`d-none d-md-block ${styles.wrapper}`}>
      <div className="container-lg px-lg-0 py-2">
        <div className="mt-3 mb-2">
          <small className="text-secondary font-weight-bold">Other packages recommended by the publisher:</small>
        </div>

        <div className="flex flex-column pb-3 pt-2">
          {recommendations.map((pkg: RecommendedPackage) => (
            <RecommendedPackageCard key={`recommended_${pkg.normalizedName}`} recommendation={pkg} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(RecommendedPackages);
