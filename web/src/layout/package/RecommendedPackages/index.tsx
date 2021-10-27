import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';

import { Recommendation, RecommendedPackage, RepositoryKind } from '../../../types';
import { getRepoKind } from '../../../utils/repoKind';
import RecommendedPackageCard from './Card';

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
    setRecommendations(prepareRecommendations(props.recommendations));
  }, [props.recommendations]);

  if (recommendations.length === 0) return null;

  return (
    <>
      <div className={`mb-2 ${props.className}`}>
        <small className="text-dark font-weight-bold">Other packages recommended by the publisher:</small>
      </div>

      <div className="flex flex-column pb-3 pt-2">
        {recommendations.map((pkg: RecommendedPackage) => (
          <RecommendedPackageCard key={`recommended_${pkg.normalizedName}`} recommendation={pkg} />
        ))}
      </div>
    </>
  );
};

export default React.memo(RecommendedPackages);
