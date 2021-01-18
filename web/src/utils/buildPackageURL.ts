import { Repository } from '../types';
import { RepoKindDef, REPOSITORY_KINDS } from './data';

export default (normalizedName: string, repository: Repository, version: string, withVersion?: boolean): string => {
  const getRepositoryKindName = (): string => {
    const kind = REPOSITORY_KINDS.find((repoKind: RepoKindDef) => repository.kind === repoKind.kind);
    return kind!.label;
  };

  let url = `/packages/${getRepositoryKindName()}/${repository.name}/${normalizedName}`;

  if (version && withVersion) {
    url += `/${version}`;
  }

  return url;
};
