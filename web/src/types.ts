export enum RepositoryKind {
  Helm = 0,
  Falco,
  OPA,
  OLM,
}

export interface Repository {
  repositoryId?: string;
  name: string;
  displayName?: string | null;
  url: string;
  organizationName?: string | null;
  organizationDisplayName?: string | null;
  userAlias?: string | null;
  kind: RepositoryKind;
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

export interface Channel {
  name: string;
  version: string;
}

export interface Package {
  packageId: string;
  name: string;
  displayName: string | null;
  normalizedName: string;
  description: string;
  logoImageId: string | null;
  appVersion: string;
  repository: Repository;
  readme?: string | null;
  install?: string | null;
  data?: PackageData | null;
  availableVersions?: Version[];
  version?: string;
  homeUrl?: string | null;
  keywords?: string[];
  maintainers?: Maintainer[];
  deprecated: boolean | null;
  isOperator?: boolean | null;
  signed: boolean | null;
  links?: PackageLink[];
  stars?: number | null;
  eventKinds?: EventKind[];
  license?: string | null;
  createdAt: number;
  defaultChannel?: string | null;
  channels?: Channel[] | null;
  provider?: string | null;
  containerImage?: string | null;
}

export interface Version {
  version: string;
  createdAt: number;
}

export interface OLMExtraData {
  capabilities?: string;
  customResourcesExamples?: string;
}

export interface CustomResourcesDefinitionExample {
  kind: string;
  [key: string]: any;
}

export interface CustomResourcesDefinition {
  kind: string;
  name: string;
  version: string;
  description: string;
  displayName?: string;
  example?: CustomResourcesDefinitionExample;
}

export interface PackageData {
  policies?: OPAPolicies;
  rules?: { raw: string }[];
  capabilities?: string;
  customResourcesDefinitionsExamples?: string;
  customResourcesDefinitions?: CustomResourcesDefinition[];
  isGlobalOperator?: boolean;
}

export interface OPAPolicies {
  [key: string]: string;
}

export interface SearchFiltersURL {
  tsQueryWeb?: string;
  tsQuery?: string[];
  filters: {
    [key: string]: string[];
  };
  pageNumber: number;
  deprecated?: boolean | null;
  operators?: boolean | null;
}

export interface SearchQuery {
  tsQueryWeb?: string;
  tsQuery?: string[];
  filters: {
    [key: string]: string[];
  };
  deprecated?: boolean | null;
  operators?: boolean | null;
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

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserFullName {
  alias: string;
  firstName?: string;
  lastName?: string;
  profileImageId?: null | string;
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
  repositoryName = 'repositoryName',
  repositoryURL = 'repositoryURL',
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
  checkValidity: () => boolean;
  updateValue: (value: string) => void;
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

export interface TestWebhook {
  url: string;
  contentType?: string | null;
  template?: string | null;
  eventKinds: EventKind[];
}

export interface Webhook extends TestWebhook {
  webhookId?: string;
  name: string;
  description?: string;
  secret?: string;
  active: boolean;
  packages: Package[];
  lastNotifications?: null | WebhookNotification[];
}

export interface WebhookNotification {
  notificationId: string;
  createdAt: number;
  processed: boolean;
  processedAt: number;
  error: null | string;
}

export enum PayloadKind {
  default = 0,
  custom,
}

export interface Section {
  name: string;
  displayName: string;
  shortName?: string;
  disabled: boolean;
  icon?: JSX.Element;
  subsections?: Section[];
}

export interface NavSection {
  user: Section[];
  org: Section[];
}

export interface APIKey {
  apiKeyId?: string;
  name: string;
  createdAt?: number;
}

export interface APIKeyCode {
  key: string;
}

export interface OptionWithIcon {
  value: string;
  label: string;
  icon: JSX.Element;
}

export interface TsQuery {
  name: string;
  label: string;
  value: string;
}
export interface Error {
  kind: ErrorKind;
  message?: string;
}

export enum ErrorKind {
  Other,
  NotFound,
  Unauthorized,
}
