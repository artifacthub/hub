export interface PackageSummary {
  packageId: string;
  name: string;
  displayName?: string;
  normalizedName: string;
  description: string;
  logoImageId?: string;
  repository: Repository;
  version: string;
  stars?: number | null;
  ts: number;
  official?: boolean;
}

export interface Repository {
  kind: RepositoryKind;
  name: string;
  verifiedPublisher?: boolean;
  official?: boolean;
  organizationName?: string;
  organizationDisplayName?: string;
  userAlias?: string;
}

export enum RepositoryKind {
  Helm = 0,
  Falco,
  OPA,
  OLM,
  TBAction,
  Krew,
  HelmPlugin,
  TektonTask,
  KedaScaler,
  CoreDNS,
}

export interface SearchResults {
  data: {
    packages: PackageSummary[] | null;
    facets: null;
  };
  metadata: {
    limit: number;
    offset: number;
    total: number;
  };
}
