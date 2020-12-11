import { isUndefined } from 'lodash';

import { Package, Repository, RepositoryKind, Version } from '../types';
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
    install?: string;
    activeChannel?: string;
    isGlobalOperator?: boolean;
  };
}

export interface InstallMethodOutput {
  methods: InstallMethod[];
  errorMessage?: string;
}

interface PackageInfo {
  pkg?: Package | null;
  sortedVersions: Version[];
  activeChannel?: string;
}

export enum InstallMethodKind {
  Custom = 0,
  Helm,
  HelmOCI,
  OLM,
  OLMOCI,
  Falco,
}

const SPECIAL_OLM = 'community-operators';

export default (props: PackageInfo): InstallMethodOutput => {
  const { pkg, sortedVersions, activeChannel } = { ...props };

  const output: InstallMethodOutput = {
    methods: [],
  };

  if (pkg && pkg.version) {
    if (
      pkg.repository.kind === RepositoryKind.OLM &&
      sortedVersions.length > 0 &&
      pkg.version !== sortedVersions[0].version
    ) {
      output.errorMessage = 'Only the current version can be installed';
    } else {
      if (pkg.install) {
        output.methods.push({
          label: 'custom',
          title: 'Custom',
          kind: InstallMethodKind.Custom,
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
              title: 'Helm v3 (OCI)',
              kind: InstallMethodKind.HelmOCI,
              props: {
                name: pkg.name,
                version: pkg.version,
                repository: pkg.repository,
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
          break;
        case RepositoryKind.OLM:
          if (pkg.repository.url.startsWith(OCI_PREFIX)) {
            output.methods.push({
              label: 'v3',
              title: 'Helm v3 (OCI)',
              kind: InstallMethodKind.OLMOCI,
              props: {
                name: pkg.name,
                repository: pkg.repository,
                activeChannel: activeChannel,
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
                  activeChannel: activeChannel,
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
              },
            });
          }
          break;
      }
    }
  }

  return output;
};
