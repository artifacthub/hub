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
  logo_image_id: string | null;
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
  data: {
    packages: Package[];
    facets: Facets[];
  };
  metadata: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface Filters {
  [key: string]: string[];
}

export interface SearchParams {
  text?: string;
  filters: Filters;
  pageNumber: number;
}

export interface SearchQuery {
  text?: string;
  filters: Filters;
  limit: number;
  offset: number;
  total?: number;
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

export interface PackagesUpdatesInfo {
  latest_packages_added: Package[];
  packages_recently_updated: Package[];
}
