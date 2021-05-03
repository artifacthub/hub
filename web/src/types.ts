import { JSONSchema } from '@apidevtools/json-schema-ref-parser';

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

export enum HelmChartType {
  Library = 'library',
  Application = 'application',
}

export interface Repository {
  repositoryId?: string;
  name: string;
  displayName?: string | null;
  url: string;
  branch?: string | null;
  organizationName?: string | null;
  organizationDisplayName?: string | null;
  userAlias?: string | null;
  kind: RepositoryKind;
  lastTrackingTs?: number | null;
  lastTrackingErrors?: string | null;
  lastScanningTs?: number | null;
  lastScanningErrors?: string | null;
  verifiedPublisher?: boolean;
  official?: boolean;
  private?: boolean;
  authUser?: string | null;
  authPass?: string | null;
  disabled?: boolean;
  scannerDisabled?: boolean;
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
  displayName?: string;
  normalizedName: string;
  description: string;
  logoImageId?: string;
  appVersion?: string;
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
  ts: number;
  defaultChannel?: string | null;
  channels?: Channel[] | null;
  provider?: string | null;
  containersImages?: ContainerImage[] | null;
  capabilities?: string | null;
  crds?: { [key: string]: any } | null;
  crdsExamples?: CustomResourcesDefinitionExample[] | null;
  securityReportSummary?: SecurityReportSummary | null;
  securityReportCreatedAt?: number;
  hasValuesSchema?: boolean;
  hasChangelog?: boolean;
  contentUrl?: string;
  containsSecurityUpdates?: boolean;
  prerelease?: boolean;
  recommendations?: Recommendation[];
  official?: boolean;
  stats?: PackageStats;
}

export interface PackageStats {
  subscriptions: number;
  webhooks: number;
}

export interface ContainerImage {
  image: string;
  name?: string;
}

export interface Version {
  version: string;
  containsSecurityUpdates: boolean;
  prerelease: boolean;
  ts: number;
}

export interface OLMExtraData {
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

export interface Dependency {
  name: string;
  version: string;
  repository?: string;
}

export interface Recommendation {
  url: string;
}

export interface RecommendedPackage {
  url: string;
  kind: RepositoryKind;
  normalizedName: string;
  repoName: string;
}

export interface PackageData {
  policies?: OPAPolicies;
  rules?: { Raw: string }[] | FalcoRules;
  dependencies?: Dependency[];
  customResourcesDefinitionsExamples?: string;
  customResourcesDefinitions?: CustomResourcesDefinition[];
  isGlobalOperator?: boolean;
  manifestRaw?: string;
  pipelinesMinVersion?: string;
  platforms?: string[];
  apiVersion?: string;
  type?: HelmChartType;
  kubeVersion?: string;
}

export interface OPAPolicies {
  [key: string]: string;
}

export interface FalcoRules {
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
  verifiedPublisher?: boolean | null;
  official?: boolean | null;
}

export interface SearchQuery {
  tsQueryWeb?: string;
  tsQuery?: string[];
  filters: {
    [key: string]: string[];
  };
  deprecated?: boolean | null;
  operators?: boolean | null;
  verifiedPublisher?: boolean | null;
  official?: boolean | null;
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
  total?: number;
}

export interface Option extends FacetOption {
  filterKey: string;
  icon?: JSX.Element;
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
  passwordSet: boolean;
  tfaEnabled?: boolean;
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

export interface TwoFactorAuth {
  qrCode: string;
  recoveryCodes: string[];
  secret: string;
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

export interface RefInputTypeaheadField {
  reset: () => void;
  getValue: () => string;
  updateValue: (value: string) => void;
}

export interface RefActionBtn {
  reRender: () => void;
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

export interface NotificationsPrefs {
  lastDisplayedTime: null | number;
  enabled: boolean;
  displayed: string[];
}

export interface Prefs {
  theme: ThemePrefs;
  controlPanel: {
    selectedOrg?: string;
  };
  search: {
    limit: number;
  };
  notifications: NotificationsPrefs;
}

export interface ThemePrefs {
  configured: string;
  effective: string;
}

export interface PackageStars {
  starredByUser?: boolean | null;
  stars: number | null;
}

export enum EventKind {
  NewPackageRelease = 0,
  SecurityAlert,
  RepositoryTrackingErrors,
  RepositoryOwnershipClaim,
  RepositoryScanningErrors,
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
  error?: null | string;
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
  onlyDesktop?: boolean;
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
  secret: string;
  apiKeyId: string;
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
  Forbidden,
  Gone,
  InvalidCSRF,
  NotApprovedSession,
}

export interface OptOutItem {
  optOutId: string;
  repository: Repository;
  eventKind: EventKind;
}

export enum AuthorizerAction {
  AddOrganizationMember = 'addOrganizationMember',
  AddOrganizationRepository = 'addOrganizationRepository',
  DeleteOrganization = 'deleteOrganization',
  DeleteOrganizationMember = 'deleteOrganizationMember',
  DeleteOrganizationRepository = 'deleteOrganizationRepository',
  GetAuthorizationPolicy = 'getAuthorizationPolicy',
  TransferOrganizationRepository = 'transferOrganizationRepository',
  UpdateAuthorizationPolicy = 'updateAuthorizationPolicy',
  UpdateOrganization = 'updateOrganization',
  UpdateOrganizationRepository = 'updateOrganizationRepository',
}

export interface AuthorizerInput {
  action: AuthorizerAction;
  organizationName?: string;
  user: string;
  onCompletion?: () => void;
}

export interface RegoPlaygroundPolicy {
  rego_modules: {
    'policy.rego': string;
  };
  input: {
    [key: string]: string | string[];
  };
  data: {
    [key: string]: any;
  };
}

export interface RegoPlaygroundResult {
  result: string;
}

export interface OrganizationPolicy {
  authorizationEnabled: boolean;
  predefinedPolicy?: string | null;
  customPolicy?: string | null;
  policyData?: string | null;
}

export interface AuthorizationPolicy {
  name: string;
  label: string;
  policy: string;
  data: {
    [key: string]: any;
  };
}

export interface SearchTipItem {
  content: JSX.Element | string;
  example: string;
}

export type SecurityReportSummary = {
  [key in VulnerabilitySeverity]?: number;
};

export interface SecurityReport {
  [key: string]: SecurityTargetReport[];
}

export interface SecurityTargetReport {
  Target: string;
  Type: string;
  Vulnerabilities: Vulnerability[] | null;
}

export interface Vulnerability {
  [key: string]: any;
  Severity: VulnerabilitySeverity;
}

export enum VulnerabilitySeverity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  UnKnown = 'unknown',
}

export interface SeverityRating {
  color: string;
  level: 'A' | 'B' | 'C' | 'D' | 'F' | '-';
}

export type SeverityRatingList = {
  [key in VulnerabilitySeverity | 'default']?: SeverityRating;
};

export interface CVSSVectorMetric {
  value: string;
  label: string;
  options: CVSSVectorOpt[];
}

export interface CVSSVectorOpt {
  value: string;
  label: string;
  level: number;
}

export enum ChangeKind {
  added = 'added',
  changed = 'changed',
  deprecated = 'deprecated',
  removed = 'removed',
  fixed = 'fixed',
  security = 'security',
}

export interface Change {
  kind?: ChangeKind;
  description: string;
  links?: PackageLink[];
}

export interface ChangeLog {
  version: string;
  ts: number;
  prerelease: boolean;
  containsSecurityUpdates: boolean;
  changes?: Change[];
}

export interface ActiveJSONSchemaValue {
  active: number;
  combinationType: string | null;
  options: JSONSchema[];
  error?: boolean;
}

export interface UserNotification {
  id: string;
  body: string;
  linkTip?: string;
}

export enum PathTips {
  Home = 'home',
  Package = 'package',
  Search = 'search',
  ControlPanel = 'control-panel',
}

export interface ChartTemplatesData {
  templates: ChartTemplate[];
  values: any;
}

export interface ChartTemplate {
  name: string;
  fileName?: string;
  resourceKinds?: string[];
  type: ChartTmplTypeFile;
  data: string;
}

export enum ChartTmplTypeFile {
  Template,
  Helper,
}

export enum ChartTemplateSpecialType {
  BuiltInObject,
  ValuesBuiltInObject,
  Function,
  FlowControl,
  Variable,
  String,
}

export interface AHStats {
  generatedAt: number;
  packages: {
    total: number;
    runningTotal?: any[];
    createdMonthly?: any[];
  };
  repositories: {
    total: number;
    runningTotal?: any[];
    createdMonthly?: any[];
  };
  snapshots: {
    total: number;
    createdMonthly?: any[];
    runningTotal?: any[];
  };
  organizations: {
    total: number;
    runningTotal?: any[];
  };
  users: {
    total: number;
    runningTotal?: any[];
  };
}

export interface TOCEntryItem {
  level: number;
  title: string;
  link: string;
  children?: TOCEntryItem[];
}
