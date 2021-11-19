import { RepositoryKind } from '../types';
import { getRepoKindName } from './repoKind';

interface MinRepository {
  kind: RepositoryKind;
  name: string;
}

const buildPackageURL = (
  normalizedName: string,
  repository: MinRepository,
  version?: string,
  withVersion?: boolean
): string => {
  let url = `/packages/${getRepoKindName(repository.kind)!}/${repository.name}/${normalizedName}`;

  if (version && withVersion) {
    url += `/${version}`;
  }

  return url;
};

export default buildPackageURL;
