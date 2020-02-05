export enum PackageKind {
  Chart = 0,
  Operator,
};

export interface ChartRepository {
  name: string;
  display_name: string;
  url: string;
}

export interface MaintainerInfo {
  name?: string;
  email: string;
}

export interface Package {
  package_id: string;
  kind: PackageKind;
  name: string;
  display_name: string | null;
  description: string;
  logo_url: string | null;
  app_version: string;
  chart_repository: ChartRepository;
}

export interface PackageDetail extends Package {
  readme: string | null;
  available_versions: string[];
  version: string;
  home_url: string | null;
  keywords: string[];
  maintainers: MaintainerInfo[];
}

export interface SearchResults {
  packages: Package[];
  facets: Facets[];
}

export interface Filters {
  [key: string]: string[];
}

export interface SearchQuery {
  text?: string;
  filters: Filters;
}

export interface SearchParams extends SearchQuery {
  keywords: string[];
  packageKinds: string[];
}

export interface Stats {
  packages: number;
  releases: number;
}

export interface Facets {
  filter_key: string;
  title: string;
  options: FacetOption[];
};

export interface FacetOption {
  id: string;
  name: string;
  total: number;
}
