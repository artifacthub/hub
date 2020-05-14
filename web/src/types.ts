export enum PackageKind {
  Chart = 0,
  Falco,
  Opa,
}

export interface ChartRepository {
  name: string;
  displayName?: string | null;
  url: string;
  lastTrackingTs?: number | null;
  lastTrackingErrors?: string | null;
}

export interface Maintainer {
  name?: string;
  email: string;
}

export interface PackageLink {
  name: string;
  url: string;
}

export interface Package {
  packageId: string;
  kind: PackageKind;
  name: string;
  displayName: string | null;
  normalizedName: string;
  description: string;
  logoImageId: string | null;
  appVersion: string;
  chartRepository: ChartRepository | null;
  readme?: string | null;
  data?: PackageData | null;
  availableVersions?: string[];
  version?: string;
  homeUrl?: string | null;
  keywords?: string[];
  maintainers?: Maintainer[];
  deprecated: boolean | null;
  organizationName?: string | null;
  organizationDisplayName?: string | null;
  links?: PackageLink[];
  stars?: number | null;
  userAlias: string | null;
  eventKinds?: EventKind[];
}

export interface PackageData {
  policies?: { raw: string }[];
  rules?: { raw: string }[];
}

export interface SearchFiltersURL {
  text?: string;
  filters: {
    [key: string]: string[];
  };
  pageNumber: number;
  deprecated: boolean;
}

export interface SearchQuery {
  text?: string;
  filters: {
    [key: string]: string[];
  };
  deprecated: boolean;
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
}

export interface FacetOption {
  id: string | number;
  name: string;
  total: number;
}

export interface PackagesUpdatesList {
  latestPackagesAdded: Package[];
  packagesRecentlyUpdated: Package[];
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserFullName {
  alias: string;
  firstName?: string;
  lastName?: string;
}

export interface Profile extends UserFullName {
  email: string;
}

export interface User extends UserLogin {
  alias: string;
  firstName?: string;
  lastName?: string;
}

export interface Member {
  alias: string;
  firstName?: string;
  lastName?: string;
  confirmed?: boolean;
}

export interface UserAuth {
  alias?: string;
  status: boolean;
}

export interface CheckAvailabilityProps {
  resourceKind: ResourceKind;
  value: string;
}

export enum ResourceKind {
  userAlias = 'userAlias',
  chartRepositoryName = 'chartRepositoryName',
  chartRepositoryURL = 'chartRepositoryURL',
  organizationName = 'organizationName',
}

export interface Organization {
  name: string;
  displayName?: string;
  homeUrl?: string;
  logoImageId?: string;
  description?: string;
  membersCount?: number | null;
  confirmed?: boolean | null;
}

export interface RefInputField {
  checkIsValid: () => Promise<boolean>;
  reset: () => void;
  getValue: () => string;
}

export interface Alert {
  type: 'success' | 'danger' | 'warning';
  message: string;
  dismissOn?: number;
  autoClose?: boolean;
}

export interface LogoImage {
  imageId: string;
}

export interface AvailabilityInfo {
  isAvailable: boolean;
  resourceKind: ResourceKind;
  excluded: string[];
}

export interface Prefs {
  controlPanel: {
    selectedOrg?: string;
  };
  search: {
    limit: number;
  };
}

export interface PackageStars {
  starredByUser: boolean | null;
  stars: number | null;
}

export enum EventKind {
  NewPackageRelease = 0,
  SecurityAlert,
}

export interface Subscription {
  eventKind: EventKind;
}
