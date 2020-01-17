export enum PackageKind {
  Chart = 0,
  Operator,
};

export interface ChartRepository {
  name: string;
  display_name: string;
}

export interface MaintainerInfo {
  name: string;
  email: string;
}

export interface Package {
  package_id: string;
  kind: PackageKind;
  name: string;
  display_name: string | null;
  description: string;
  logo_url: string | null;
  latest_version: string;
  chart_repository: ChartRepository;
}

export interface PackageDetail extends Package {
  readme: string | null;
  available_versions: string[];
  version: string;
  app_version: string;
  maintainers: MaintainerInfo[];
}

export interface PackagesList {
  packages: Package[];
}

export interface SearchQuery {
  text?: string;
  activeKeywords: string[];
  activePackageKinds: string[];
}

export interface SearchParams extends SearchQuery {
  keywords: string[];
  packageKinds: string[];
}
