import { isNull, isUndefined } from 'lodash';

import { Channel, HelmChartType, Package, Repository, RepositoryKind } from '../types';
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
}

const SPECIAL_OLM = 'community-operators';

export default (props: PackageInfo): InstallMethodOutput => {
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
            title: 'Helm v3 (>=3.7)',
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
        if (isUndefined(pkg.install)) {
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
    }
  }

  return output;
};
