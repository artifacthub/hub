import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';

import {
  Channel,
  ContainerImage,
  GatekeeperExample,
  HelmChartType,
  Package,
  Policies,
  Repository,
  RepositoryKind,
} from '../types';
import { OCI_PREFIX } from './data';

export interface InstallMethod {
  label: string;
  title: string;
  shortTitle?: string;
  kind: InstallMethodKind;
  props: {
    normalizedName?: string;
    name?: string;
    version?: string;
    repository?: Repository;
    contentUrl?: string;
    defaultChannel?: string | null;
    channels?: Channel[] | null;
    install?: string;
    isGlobalOperator?: boolean;
    isPrivate?: boolean;
    images?: ContainerImage[] | null;
    relativePath?: string;
    examples?: GatekeeperExample[];
    policies?: Policies;
  };
}

export interface InstallMethodOutput {
  methods: InstallMethod[];
  errorMessage?: string;
}

interface PackageInfo {
  pkg?: Package | null;
}

export enum InstallMethodKind {
  PublisherInstructions = 0,
  Helm,
  HelmOCI,
  OLM,
  OLMOCI,
  Falco,
  Krew,
  HelmPlugin,
  Tekton,
  Kubewarden,
  KustomizeGatekeeperInstall,
  KubectlGatekeeperInstall,
  KubeArmor,
}

const SPECIAL_OLM = 'community-operators';
const SPECIAL_FALCO = 'security-hub';

const getInstallMethods = (props: PackageInfo): InstallMethodOutput => {
  const { pkg } = { ...props };

  const output: InstallMethodOutput = {
    methods: [],
  };

  const checkIfErrorMessage = (): boolean => {
    let hasError = false;
    if (pkg) {
      switch (pkg.repository.kind) {
        case RepositoryKind.OLM:
          if (
            pkg.repository.name === SPECIAL_OLM &&
            (isNull(pkg.channels) || isUndefined(pkg.channels) || pkg.channels.length === 0)
          ) {
            output.errorMessage = 'Only packages with channels can be installed';
            hasError = true;
          }
          break;
        case RepositoryKind.Helm:
          if (pkg.data && pkg.data.type && pkg.data.type === HelmChartType.Library) {
            output.errorMessage = 'A library chart is not installable';
            hasError = true;
          }
          break;
        case RepositoryKind.Falco:
          if (isUndefined(pkg.install) && pkg.repository.name !== SPECIAL_FALCO) {
            output.errorMessage = 'This package does not include installation instructions yet.';
            hasError = true;
          }
          break;
        case RepositoryKind.KubeArmor:
          if (isUndefined(pkg.install) && (isUndefined(pkg.data) || (pkg.data && isUndefined(pkg.data.policies)))) {
            output.errorMessage = 'This package does not include installation instructions yet.';
            hasError = true;
          }
          break;
        case RepositoryKind.OPA:
        case RepositoryKind.TBAction:
        case RepositoryKind.KedaScaler:
        case RepositoryKind.CoreDNS:
        case RepositoryKind.Keptn:
        case RepositoryKind.Kyverno:
        case RepositoryKind.KnativeClientPlugin:
        case RepositoryKind.Backstage:
        case RepositoryKind.ArgoTemplate:
        case RepositoryKind.KCL:
        case RepositoryKind.Headlamp:
        case RepositoryKind.InspektorGadget:
        case RepositoryKind.MesheryDesign:
        case RepositoryKind.OpenCost:
        case RepositoryKind.RadiusRecipe:
          if (isUndefined(pkg.install)) {
            output.errorMessage = 'This package does not include installation instructions yet.';
            hasError = true;
          }
          break;
      }
    }
    return hasError;
  };

  if (pkg && pkg.version && !checkIfErrorMessage()) {
    if (pkg.install) {
      output.methods.push({
        label: 'publisher',
        title: 'Publisher instructions',
        kind: InstallMethodKind.PublisherInstructions,
        props: {
          install: pkg.install,
        },
      });
    }

    switch (pkg.repository.kind) {
      case RepositoryKind.Helm:
        if (pkg.repository.url.startsWith(OCI_PREFIX)) {
          output.methods.push({
            label: 'v3',
            title: 'Helm v3 (>=3.8)',
            kind: InstallMethodKind.HelmOCI,
            props: {
              name: pkg.name,
              version: pkg.version,
              repository: pkg.repository,
            },
          });
        } else {
          if (pkg.data && pkg.data.apiVersion && pkg.data.apiVersion === 'v2') {
            output.methods.push({
              label: 'v3',
              title: 'Helm v3',
              kind: InstallMethodKind.Helm,
              props: {
                name: pkg.name,
                version: pkg.version,
                repository: pkg.repository,
                contentUrl: pkg.contentUrl,
              },
            });
          } else {
            output.methods.push(
              {
                label: 'v3',
                title: 'Helm v3',
                kind: InstallMethodKind.Helm,
                props: {
                  name: pkg.name,
                  version: pkg.version,
                  repository: pkg.repository,
                  contentUrl: pkg.contentUrl,
                },
              },
              {
                label: 'v2',
                title: 'Helm v2',
                kind: InstallMethodKind.Helm,
                props: {
                  name: pkg.name,
                  version: pkg.version,
                  repository: pkg.repository,
                  contentUrl: pkg.contentUrl,
                },
              }
            );
          }
        }
        break;
      case RepositoryKind.OLM:
        if (pkg.repository.url.startsWith(OCI_PREFIX)) {
          output.methods.push({
            label: 'cli',
            title: 'OLM OCI',
            kind: InstallMethodKind.OLMOCI,
            props: {
              name: pkg.name,
              repository: pkg.repository,
              defaultChannel: pkg.defaultChannel,
              channels: pkg.channels,
            },
          });
        } else {
          if (pkg.repository.name === SPECIAL_OLM) {
            output.methods.push({
              label: 'cli',
              title: 'Operator Lifecycle Manager',
              shortTitle: 'OLM CLI',
              kind: InstallMethodKind.OLM,
              props: {
                name: pkg.name,
                isGlobalOperator: pkg.data!.isGlobalOperator,
                defaultChannel: pkg.defaultChannel,
                channels: pkg.channels,
                isPrivate: pkg.repository.private,
              },
            });
          }
        }
        break;
      case RepositoryKind.Falco:
        if (isUndefined(pkg.install) && pkg.repository.name === SPECIAL_FALCO) {
          output.methods.push({
            label: 'cli',
            title: 'Helm CLI',
            kind: InstallMethodKind.Falco,
            props: {
              normalizedName: pkg.normalizedName,
              isPrivate: pkg.repository.private,
            },
          });
        }
        break;
      case RepositoryKind.Krew:
        if (isUndefined(pkg.install)) {
          output.methods.push({
            label: 'krew',
            title: 'Krew',
            kind: InstallMethodKind.Krew,
            props: {
              name: pkg.name,
              repository: pkg.repository,
            },
          });
        }
        break;
      case RepositoryKind.HelmPlugin:
        if (isUndefined(pkg.install)) {
          output.methods.push({
            label: 'cli',
            title: 'Helm CLI',
            kind: InstallMethodKind.HelmPlugin,
            props: {
              repository: pkg.repository,
            },
          });
        }
        break;
      case RepositoryKind.TektonTask:
      case RepositoryKind.TektonPipeline:
      case RepositoryKind.TektonStepAction:
        if (isUndefined(pkg.install)) {
          output.methods.push({
            label: 'kubectl',
            title: 'Kubectl',
            kind: InstallMethodKind.Tekton,
            props: {
              contentUrl: pkg.contentUrl,
              repository: pkg.repository,
              isPrivate: pkg.repository!.private,
            },
          });
        }
        break;
      case RepositoryKind.Kubewarden:
        if (isUndefined(pkg.install)) {
          output.methods.push({
            label: 'kubewarden',
            title: 'Kubewarden CLI',
            kind: InstallMethodKind.Kubewarden,
            props: {
              images: pkg.containersImages,
              isPrivate: pkg.repository!.private,
            },
          });
        }
        break;
      case RepositoryKind.Gatekeeper:
        if (isUndefined(pkg.install)) {
          output.methods.push(
            {
              label: 'kustomize',
              title: 'Kustomize',
              kind: InstallMethodKind.KustomizeGatekeeperInstall,
              props: {
                repository: pkg.repository,
                relativePath: pkg.relativePath!,
              },
            },
            {
              label: 'kubectl',
              title: 'Kubectl',
              kind: InstallMethodKind.KubectlGatekeeperInstall,
              props: {
                repository: pkg.repository,
                examples: pkg.data!.examples as GatekeeperExample[],
                relativePath: pkg.relativePath!,
              },
            }
          );
        }
        break;
      case RepositoryKind.KubeArmor:
        if (isUndefined(pkg.install)) {
          output.methods.push({
            label: 'kubectl',
            title: 'Kubectl',
            kind: InstallMethodKind.KubeArmor,
            props: {
              repository: pkg.repository,
              policies: pkg.data && pkg.data.policies ? pkg.data.policies : undefined,
              relativePath: pkg.relativePath!,
            },
          });
        }
        break;
    }
  }

  return output;
};

export default getInstallMethods;
