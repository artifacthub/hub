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
  cncf?: boolean;
  signed?: boolean;
  deprecated?: boolean;
  hasValuesSchema?: boolean;
}

export interface Repository {
  kind: RepositoryKind;
  name: string;
  verifiedPublisher?: boolean;
  official?: boolean;
  cncf?: boolean;
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

export interface SearchResults {
  packages: PackageSummary[] | null;
  facets: null;
}
