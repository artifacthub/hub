export enum PackageKind {
  Chart = 0,
  Operator,
};

export interface ChartRepository {
  name: string;
  displayName: string | null;
  url: string;
}

export interface Maintainer {
  name?: string;
  email: string;
}

export interface Package {
  packageId: string;
  kind: PackageKind;
  name: string;
  displayName: string | null;
  description: string;
  logoImageId: string | null;
  appVersion: string;
  chartRepository: ChartRepository | null;
  readme?: string | null;
  availableVersions?: string[];
  version?: string;
  homeUrl?: string | null;
  keywords?: string[];
  maintainers?: Maintainer[];
}

export interface SearchFiltersURL {
  text?: string;
  filters: {
    [key: string]: string[];
  };
  pageNumber: number;
}

export interface SearchQuery {
  text?: string;
  filters: {
    [key: string]: string[];
  };
  limit: number;
  offset: number;
  total?: number;
}

export interface SearchResults {
  data: {
    packages: Package[] | null;
    facets: Facets[] | null;
  };
  metadata: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface Stats {
  packages: number;
  releases: number;
}

export interface Facets {
  filterKey: string;
  title: string;
  options: FacetOption[];
};

export interface FacetOption {
  id: string | number;
  name: string;
  total: number;
}

export interface PackagesUpdatesList {
  latestPackagesAdded: Package[];
  packagesRecentlyUpdated: Package[];
}

export interface User {
  alias: string;
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
}
