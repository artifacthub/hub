import { JSONSchema } from './jsonschema';

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
  Keptn,
  TektonPipeline,
  Container,
  Kubewarden,
  Gatekeeper,
  Kyverno,
  KnativeClientPlugin,
  Backstage,
  ArgoTemplate,
  KubeArmor,
  KCL,
  Headlamp,
  InspektorGadget,
  TektonStepAction,
  MesheryDesign,
  OpenCost,
  RadiusRecipe,
}

export enum PackageCategory {
  'AI / Machine learning' = 1,
  Database,
  'Integration and delivery',
  'Monitoring and logging',
  Networking,
  Security,
  Storage,
  'Streaming and messaging',
}

export enum KeptnData {
  Version = 'keptnVersion',
  Kind = 'keptnKind',
}

export enum KubewardenData {
  Resources = 'kubewardenResources',
  Mutation = 'kubewardenMutation',
}

export enum KyvernoData {
  Subject = 'kyvernoSubject',
  Version = 'kyvernoVersion',
  KubernetesVersion = 'kyvernoKubernetesVersion',
  Category = 'kyvernoCategory',
}

export enum HeadlampData {
  Url = 'headlampPluginArchiveUrl',
  Checksum = 'headlampPluginArchiveChecksum',
  Version = 'headlampPluginVersionCompat',
  Flavors = 'headlampPluginDistroCompat',
}

export enum HelmChartType {
  Library = 'library',
  Application = 'application',
}

export enum ArgoTemplateData {
  Version = 'argoVersion',
}

export enum Signature {
  Prov = 'prov',
  Cosign = 'cosign',
}

export enum VersioningOption {
  Git = 'git',
  Directory = 'directory',
}

export enum RadiusRecipeData {
  Recipe = 'recipe',
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
  cncf?: boolean;
  private?: boolean;
  authUser?: string | null;
  authPass?: string | null;
  disabled?: boolean;
  scannerDisabled?: boolean;
  data?: {
    tags?: ContainerTag[];
    versioning?: VersioningOption;
  };
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  cncf?: boolean;
  stats?: PackageStats;
  allContainersImagesWhitelisted?: boolean;
  signKey?: HelmChartSignKey;
  signatures?: Signature[];
  screenshots?: Screenshot[];
  productionOrganizationsCount?: number;
  relativePath?: string;
  category?: PackageCategory;
}

export interface Screenshot {
  title?: string;
  url: string;
}

export interface HelmChartSignKey {
  fingerprint: string;
  url: string;
}

export interface PackageStats {
  subscriptions: number;
  webhooks: number;
}

export interface ContainerImage {
  image: string;
  name?: string;
  platforms?: string[];
  whitelisted?: boolean;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  artifacthubRepositoryName?: string;
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
  policies?: Policies;
  examples?: GatekeeperExample[] | { [key: string]: string };
  rules?: { Raw: string; Name: string }[] | FalcoRules;
  dependencies?: Dependency[];
  customResourcesDefinitionsExamples?: string;
  customResourcesDefinitions?: CustomResourcesDefinition[];
  isGlobalOperator?: boolean;
  design?: string;
  manifestRaw?: string;
  template?: string;
  pipelinesMinVersion?: string;
  platforms?: string[];
  apiVersion?: string;
  type?: HelmChartType;
  kubeVersion?: string;
  policy?: string;
  [KeptnData.Version]?: string;
  [KeptnData.Kind]?: string;
  [KubewardenData.Resources]?: string;
  [KubewardenData.Mutation]?: string;
  [KyvernoData.Subject]?: string;
  [KyvernoData.Version]?: string;
  [KyvernoData.Category]?: string;
  [KyvernoData.KubernetesVersion]?: string;
  [HeadlampData.Url]?: string;
  [HeadlampData.Checksum]?: string;
  [HeadlampData.Version]?: string;
  [HeadlampData.Flavors]?: string;
  [ArgoTemplateData.Version]?: string;
  tasks?: TektonTaskInPipeline[];
  alternativeLocations?: string[];
  [RadiusRecipeData.Recipe]?: { [key: string]: string };
}

export interface TektonTaskInPipeline {
  name: string;
  runAfter?: string[];
  artifacthubRepositoryName?: string;
}

export interface GatekeeperExample {
  name: string;
  cases: GatekeeperCase[];
}

export interface GatekeeperCase {
  name: string;
  path: string;
  content: string;
}
export interface Policies {
  [key: string]: string;
}

export interface ContentDefaultModalItem {
  name: string;
  file: string;
}

export interface FalcoRules {
  [key: string]: string;
}

export interface SearchFiltersURL extends BasicQuery {
  pageNumber: number;
  sort?: string | null;
}

export interface BasicQuery {
  tsQueryWeb?: string;
  name?: string;
  filters?: {
    [key: string]: string[];
  };
  deprecated?: boolean | null;
  operators?: boolean | null;
  verifiedPublisher?: boolean | null;
  official?: boolean | null;
  cncf?: boolean | null;
  total?: number;
}

export interface SearchQuery extends BasicQuery {
  limit: number;
  offset: number;
  sort?: string;
}

export interface SearchResults {
  packages: Package[] | null;
  facets: Facets[] | null;
  paginationTotalCount: string;
}

export interface Stats {
  packages: number;
  releases: number;
}

export interface Facets {
  filterKey?: string;
  title: string;
  options: FacetOption[];
}

export interface FacetOption {
  id: string | number;
  name: string;
  total?: number;
  filterKey?: string;
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
  usedInProduction?: boolean;
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
  type: 'success' | 'danger' | 'warning' | 'info';
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
  All = 'all',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  [key: string]: { Results: SecurityReportResult[] };
}

export interface SecurityReportResult {
  Target: string;
  Type: string;
  Vulnerabilities: Vulnerability[] | null;
}

export interface Vulnerability {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  Severity: VulnerabilitySeverity;
}

export interface FixableVulnerabilitiesInReport {
  report: {
    [key: string]: { summary: SecurityReportSummary; total: number };
  };
  summary: SecurityReportSummary;
  total: number;
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
  templates: {
    name: string;
    data: string;
  }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any;
}

export interface ChartTemplate {
  name: string;
  fileName?: string;
  resourceKinds?: string[];
  type: ChartTmplTypeFile;
  data: string;
}

export interface CompareChartTemplate {
  name: string;
  fileName?: string;
  resourceKinds?: string[];
  type: ChartTmplTypeFile;
  data: string;
  compareData: string;
  status: CompareChartTemplateStatus;
}

export enum ChartTmplTypeFile {
  Template,
  Helper,
}

export enum CompareChartTemplateStatus {
  Added = 'added',
  Deleted = 'deleted',
  Modified = 'modified',
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
  generatedAt?: number;
  packages: {
    total: number;
    runningTotal?: number[][];
    createdMonthly?: number[][];
    viewsDaily?: number[][];
    viewsMonthly?: number[][];
    topViewsToday?: TopViewsItem[];
    topViewsCurrentMonth?: TopViewsItem[];
  };
  repositories: {
    total: number;
    runningTotal?: number[][];
    createdMonthly?: number[][];
  };
  snapshots: {
    total: number;
    createdMonthly?: number[][];
    runningTotal?: number[][];
  };
  organizations: {
    total: number;
    runningTotal?: number[][];
  };
  users: {
    total: number;
    runningTotal?: number[][];
  };
}

export interface TopViewsItem {
  package: Package;
  views: number;
}

export interface PackageViewsStats {
  [key: string]: {
    [key: string]: number;
  };
}

export interface TOCEntryItem {
  depth: number;
  value: string;
  children?: TOCEntryItem[];
}

export enum ContentDefaultModalKind {
  CustomResourcesDefinition,
  Policy,
  Rules,
  Examples,
}

export interface ContainerTag {
  name: string;
  mutable: boolean;
  id?: string;
}

export interface TemplatesQuery {
  template?: string;
  compareTo?: string;
  line?: string;
}

export interface ValuesQuery extends TemplatesQuery {
  selectedLine?: string;
}

export interface DefinedTemplatesList {
  [key: string]: DefinedTemplate;
}

export interface DefinedTemplate {
  template: string;
  line: number;
}

export interface Banner {
  name?: string;
  link?: string;
  images: {
    'light-theme': string;
    'dark-theme': string;
  };
}

export interface OutletContext {
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  scrollPosition?: number;
  setScrollPosition: (value?: number) => void;
  viewedPackage?: string;
  setViewedPackage: (value?: string) => void;
}

export enum SortOption {
  Relevance = 'relevance',
  Stars = 'stars',
  'Last updated' = 'last_updated',
}
