import isUndefined from 'lodash/isUndefined';

import { Package } from '../types';
import { RepoKindDef, REPOSITORY_KINDS } from './data';

export default (packageItem: Package, withVersion?: boolean): string => {
  const getRepositoryKindName = (): string => {
    const kind = REPOSITORY_KINDS.find((repoKind: RepoKindDef) => packageItem.repository.kind === repoKind.kind);
    return kind!.label;
  };

  let url = `/packages/${getRepositoryKindName()}/${packageItem.repository.name}/${packageItem.normalizedName}`;

  if (!isUndefined(packageItem.version) && !isUndefined(withVersion) && withVersion) {
    url += `/${packageItem.version}`;
  }

  return url;
};
