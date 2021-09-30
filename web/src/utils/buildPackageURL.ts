import { RepositoryKind } from '../types';
import { getRepoKindName } from './repoKind';

interface MinRepository {
  kind: RepositoryKind;
  name: string;
}

export default (normalizedName: string, repository: MinRepository, version?: string, withVersion?: boolean): string => {
  let url = `/packages/${getRepoKindName(repository.kind)!}/${repository.name}/${normalizedName}`;

  if (version && withVersion) {
    url += `/${version}`;
  }

  return url;
};
