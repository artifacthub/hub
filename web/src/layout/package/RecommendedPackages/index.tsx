import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { memo, useEffect, useState } from 'react';
import { FiPackage } from 'react-icons/fi';

import { Recommendation, RecommendedPackage, RepositoryKind } from '../../../types';
import { getRepoKind } from '../../../utils/repoKind';
import RecommendedPackageCard from './Card';
import styles from './RecommendedPackages.module.css';

interface Props {
  recommendations?: Recommendation[];
  className?: string;
}

export const URL_regex =
  /^https:\/\/([^\/?]+)\/packages\/(helm|falco|opa|olm|tbaction|krew|helm-plugin|tekton-task|keda-scaler|coredns|keptn|tekton-pipeline|kubewarden|gatekeeper|kyverno|knative-client-plugin|backstage|argo-template|kubearmor|inspektor-gadget|tekton-stepaction|meshery|opencost|radius|container)\/([a-z0-9-]+)\/([a-z0-9-]+)$/; // eslint-disable-line

const prepareRecommendations = (recommendations?: Recommendation[]): RecommendedPackage[] => {
  const list: RecommendedPackage[] = [];

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
          <FiPackage />
        </span>
        <small className="text-muted ms-2">Other packages recommended by the publisher:</small>
        <small className="fw-bold ms-2">{recommendations.length}</small>
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

export default memo(RecommendedPackages);
