import { Repository } from '../types';
import { getRepoKindName } from './repoKind';

export default (normalizedName: string, repository: Repository, version: string, withVersion?: boolean): string => {
  let url = `/packages/${getRepoKindName(repository.kind)!}/${repository.name}/${normalizedName}`;

  if (version && withVersion) {
    url += `/${version}`;
  }

  return url;
};
