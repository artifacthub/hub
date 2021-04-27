# Repositories guide

Artifact Hub allows publishers to list their content in an automated way. Publishers can add their repositories from the control panel, accesible from the top right menu after signing in. It's possible to create an organization and add repositories to it instead of adding them to the user account. Repositories will be indexed periodically to always display the most up-to-date content.

The following repositories kinds are supported at the moment:

- [CoreDNS plugins repositories](#coredns-plugins-repositories)
- [Falco rules repositories](#falco-rules-repositories)
- [Helm charts repositories](#helm-charts-repositories)
- [Helm plugins repositories](#helm-plugins-repositories)
- [KEDA scalers repositories](#keda-scalers-repositories)
- [Krew kubectl plugins repositories](#krew-kubectl-plugins-repositories)
- [OLM operators repositories](#olm-operators-repositories)
- [OPA policies repositories](#opa-policies-repositories)
- [Tinkerbell actions repositories](#tinkerbell-actions-repositories)
- [Tekton tasks repositories](#tekton-tasks-repositories)

This guide also contains additional information about the following repositories topics:

- [Verified publisher](#verified-publisher)
- [Official status](#official-status)
- [Ownership claim](#ownership-claim)
- [Private repositories](#private-repositories)

## CoreDNS plugins repositories

CoreDNS plugins repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your packages like it would show in the filesystem.*

The *path/to/packages* provided can contain metadata for one or more packages. Each package version **must** be on a separate folder, and it's up to you to decide if you want to publish one or multiple versions of your package.

The structure of a repository with multiple plugins packages and versions could look something like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
├── package1
│   ├── 1.0.0
│   │   ├── README.md
│   │   └── artifacthub-pkg.yml
│   └── 2.0.0
│       ├── README.md
│       └── artifacthub-pkg.yml
└── package2
    └── 1.0.0
        ├── README.md
        └── artifacthub-pkg.yml
```

This structure is flexible, and in some cases it can be greatly simplified. In the case of a single package with a single version available at a time (the publisher doesn't want to make previous ones available, for example), the structure could look like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
└── package1
    ├── README.md
    └── artifacthub-pkg.yml
```

In the previous case, even the `package1` directory could be omitted. The reason is that both packages names and versions are read from the `artifacthub-pkg.yml` metadata file, so directories names are not used at all.

Each package version **needs** an `artifacthub-pkg.yml` metadata file. Please see the file [spec](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml) for more details. The [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file shown above can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at `/path/to/packages`.

Once you have added your repository, you are all set up. As you add new versions of your plugins packages or even new packages to your git repository, they'll be automatically indexed and listed in Artifact Hub.

## Falco rules repositories

Falco rules repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your packages like it would show in the filesystem.*

The *path to packages* provided can contain one or more packages. Each package version **must** be on a separate folder. You can have multiple rules files in a single package, or create a package for each rules file, it's completely up to you. In the same way, you can decide if you want to provide one or multiple versions of your rules packages.

The structure of a repository with multiple packages and versions could look something like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
├── package1
│   ├── 1.0.0
│   │   ├── artifacthub-pkg.yml
│   │   ├── more
│   │   │   └── file3-rules.yaml
│   │   ├── file1-rules.yaml
│   │   └── file2-rules.yaml
│   └── 2.0.0
│       ├── artifacthub-pkg.yml
│       └── file1-rules.yaml
└── package2
    └── 1.0.0
        ├── artifacthub-pkg.yml
        └── file1-rules.yaml
```

This structure is flexible, and in some cases it can be greatly simplified. In the case of a single package with a single version available at a time (the publisher doesn't want to make previous ones available, for example), the structure could look like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
└── package1
    ├── artifacthub-pkg.yml
    └── file1-rules.yaml
```

In the previous case, even the `package1` directory could be omitted. The reason is that both packages names and versions are read from the `artifacthub-pkg.yml` metadata file, so directories names are not used at all.

Each package version **needs** an `artifacthub-pkg.yml` metadata file. Please see the file [spec](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml) for more details. Rules files **must** have the `-rules.yaml` suffix. If you want to exclude some paths in your package from the indexing, you can do it using the `ignore` field in your [package metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml), which uses `.gitignore` syntax.

The [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file shown above can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at `/path/to/packages`.

Once you have added your repository, you are all set up. As you add new versions of your rules files or even new rules packages to your git repository, they'll be automatically indexed and listed in Artifact Hub.

### Example repository: Security Hub fork

- Rules source Github URL: [https://github.com/tegioz/cloud-native-security-hub/tree/master/artifact-hub/falco](https://github.com/tegioz/cloud-native-security-hub/tree/master/artifact-hub/falco)
- Repository URL used in Artifact Hub: [https://github.com/tegioz/cloud-native-security-hub/artifact-hub/falco](https://github.com/tegioz/cloud-native-security-hub/artifact-hub/falco) (please note how the *tree/master* part is not used)

## Helm charts repositories

Artifact Hub is able to process chart repositories as defined by the Helm project. For more information about the repository structure and different options to host your own, please check their [documentation](https://helm.sh/docs/topics/chart_repository/).

Most of the metadata Artifact Hub needs is extracted from the `Chart.yaml` file and other files in the chart package, like the `README` or `LICENSE` files. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `Chart.yaml` file. For more information, please see the [Artifact Hub Helm annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/helm_annotations.md).

There is an extra metadata file that you can add at the repository URL's path named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim).

Once you have added your repository, you are all set up. As you add new versions of your charts or even new charts to your repository, they'll be automatically indexed and listed in Artifact Hub.

### OCI experimental support

Artifact Hub is able to process chart repositories stored in [OCI registries](https://github.com/opencontainers/distribution-spec/blob/master/spec.md). This feature is experimental, and it's subject to change as [some changes to Helm OCI support are coming soon](https://github.com/helm/helm/pull/8843).

To add a repository stored in a OCI registry, the url used **must** follow the following format:

- `oci://ghcr.io/artifacthub/artifact-hub`

The chart name is expected to match the OCI reference basename (`artifact-hub` in this case), and each of the chart versions are expected to match an OCI reference tag, which are expected to be valid *semver* versions. OCI specific installation instructions will be provided in the UI when appropriate (only for Helm v3).

The sample URL shown above is actually valid, so you can give it a try yourself in your own Artifact Hub instance if you wish :)

Please note that there are some features that are not yet available for Helm repositories stored in OCI registries:

- [Verified publisher](#verified-publisher)
- [Ownership claim](#ownership-claim)
- Provenance files processing (signed label)
- Force an existing version to be reindexed by changing its digest

For additional information about Helm OCI support, please see the [HIP-0006](https://github.com/helm/community/blob/master/hips/hip-0006.md).

## Helm plugins repositories

Artifact Hub is able to process Helm plugins available in git repositories. Repositories are expected to be hosted in Github or Gitlab. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo`
- `https://gitlab.com/user/repo`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

For more information about the structure of the plugins repository, please see the [Helm plugins guide](https://helm.sh/docs/topics/plugins/#building-plugins).

Most of the metadata Artifact Hub needs is extracted from the [plugin's metadata](https://helm.sh/docs/topics/plugins/#building-plugins) file. In addition to that, if a `README.md` file is available in the plugin's directory, it'll be used as the package documentation. In the same way, if a `LICENSE.*` file is available in the plugin's directory, Artifact Hub will try to detect the license used and its [SPDX identifier](https://spdx.org/licenses/) will be stored.

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at the root of the repository.

### Some example repositories

- [https://github.com/helm/helm-2to3](https://github.com/helm/helm-2to3)
- [https://github.com/databus23/helm-diff](https://github.com/databus23/helm-diff)
- [https://github.com/ContainerSolutions/helm-monitor](https://github.com/ContainerSolutions/helm-monitor)

## KEDA scalers repositories

KEDA scalers repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your packages like it would show in the filesystem.*

The *path/to/packages* provided can contain metadata for one or more packages. Each package version **must** be on a separate folder, and it's up to you to decide if you want to publish one or multiple versions of your package.

The structure of a repository with multiple scalers packages and versions could look something like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
├── package1
│   ├── 1.0.0
│   │   └── artifacthub-pkg.yml
│   └── 2.0.0
│       └── artifacthub-pkg.yml
└── package2
    └── 1.0.0
        └── artifacthub-pkg.yml
```

This structure is flexible, and in some cases it can be greatly simplified. In the case of a single package with a single version available at a time (the publisher doesn't want to make previous ones available, for example), the structure could look like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
└── package1
    └── artifacthub-pkg.yml
```

In the previous case, even the `package1` directory could be omitted. The reason is that both packages names and versions are read from the `artifacthub-pkg.yml` metadata file, so directories names are not used at all.

Each package version **needs** an `artifacthub-pkg.yml` metadata file. Please see the file [spec](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml) for more details. The [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file shown above can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at `/path/to/packages`.

Once you have added your repository, you are all set up. As you add new versions of your scalers packages or even new packages to your git repository, they'll be automatically indexed and listed in Artifact Hub.

## Krew kubectl plugins repositories

Artifact Hub is able to process kubectl plugins listed in [Krew index repositories](https://krew.sigs.k8s.io/docs/developer-guide/custom-indexes/). Repositories are expected to be hosted in Github or Gitlab. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo`
- `https://gitlab.com/user/repo`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

For more information about the structure of the Krew index repository, please see the [Hosting Custom Plugin Indexes](https://krew.sigs.k8s.io/docs/developer-guide/custom-indexes/) official documentation.

Most of the metadata Artifact Hub needs is extracted from the [plugin's manifest](https://krew.sigs.k8s.io/docs/developer-guide/plugin-manifest/) file. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `plugin manifest` file. For more information, please see the [Artifact Hub Krew annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/krew_annotations.md).

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at the root of the repository.

## OLM operators repositories

OLM operators repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/operators]`
- `https://gitlab.com/user/repo[/path/to/operators]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your operators like it would show in the filesystem.*

The *path to operators* provided can contain one or more operators, that **must** be packaged using the [format defined in the Operator Framework documentation](https://github.com/operator-framework/community-operators/blob/master/docs/contributing.md#packaging-format). This is exactly the same format required to publish operators in [operatorhub.io](https://operatorhub.io). We've adopted this format for this repository kind because of its well thought structure and to make it easier for publishers to start listing their content in Artifact Hub.

Most of the metadata Artifact Hub needs is extracted from the `CSV` file and other files in the operator package. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `CSV` file. For more information, please see the [Artifact Hub OLM annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/olm_annotations.md).

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at `/path/to/operators`.

Once you have added your repository, you are all set up. As you add new versions of your operators or even new operators to your git repository, they'll be automatically indexed and listed in Artifact Hub. To delete a specific version or operator from Artifact Hub, you just need to delete the corresponding directory from your repository. This should make it easier to keep your content up-to-date in Artifact Hub without requiring any extra effort on your side.

### OLM OCI experimental support

Artifact Hub is able to process OLM repositories stored in [OCI registries](https://github.com/opencontainers/distribution-spec/blob/master/spec.md). This feature is experimental, and it's subject to change when [some enhancements are incorporated into the Operator Framework](https://github.com/operator-framework/enhancements/pull/37).

To add a repository stored in a OCI registry, you need to provide the **catalog index image** url when registering your repository. The url used **must** follow the following format:

- `oci://docker.io/ibmcom/ibm-operator-catalog:latest`

OCI specific installation instructions will be provided in the UI for packages available in OCI registries.

Please note that there are some features that are not yet available for OLM repositories stored in OCI registries:

- [Verified publisher](#verified-publisher)
- [Ownership claim](#ownership-claim)

### Example repository: Ditto operator repository

- Operators source Github URL: [https://github.com/ctron/ditto-operator/tree/master/olm](https://github.com/ctron/ditto-operator/tree/master/olm)
- Repository URL used in Artifact Hub: [https://github.com/ctron/ditto-operator/olm](https://github.com/ctron/ditto-operator/olm) (please note how the *tree/master* part is not used)
- Operator displayed in Artifact Hub: [https://artifacthub.io/packages/olm/ditto-operator/ditto-operator](https://artifacthub.io/packages/olm/ditto-operator/ditto-operator)

## OPA policies repositories

OPA policies repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your packages like it would show in the filesystem.*

The *path to packages* provided can contain one or more packages. Each package version **must** be on a separate folder. You can have multiple policies in a single package, or create a package for each policy, it's completely up to you. In the same way, you can decide if you want to provide one or multiple versions of your policies packages.

The structure of a repository with multiple packages and versions could look something like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
├── package1
│   ├── 1.0.0
│   │   ├── artifacthub-pkg.yml
│   │   ├── more
│   │   │   └── policies3.rego
│   │   ├── policies1.rego
│   │   └── policies2.rego
│   └── 2.0.0
│       ├── artifacthub-pkg.yml
│       └── policies1.rego
└── package2
    └── 1.0.0
        ├── artifacthub-pkg.yml
        └── policies1.rego
```

This structure is flexible, and in some cases where you only have a package and a version it can be greatly simplified. The [Deprek8ion policies](#example-repository-deprek8ion-policies) repository illustrated below, for example, is using a simpler structure.

In the case of a single package with a single version available at a time (the publisher doesn't want to make previous ones available, for example), the structure could look like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
└── package1
    ├── artifacthub-pkg.yml
    ├── policies1.rego
    └── policies2.rego
```

In the previous case, even the `package1` directory could be omitted. The reason is that both packages names and versions are read from the `artifacthub-pkg.yml` metadata file, so directories names are not used at all.

Each package version **needs** an `artifacthub-pkg.yml` metadata file. Please see the file [spec](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml) for more details. Policies files **must** have the `.rego` extension. If you want to exclude some paths in your package from the indexing, you can do it using the `ignore` field in your [package metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml), which uses `.gitignore` syntax.

The [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file shown above can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at `/path/to/packages`.

Once you have added your repository, you are all set up. As you add new versions of your policies or even new policies packages to your git repository, they'll be automatically indexed and listed in Artifact Hub.

### Example repository: Deprek8ion policies

- Policies source Github URL: [https://github.com/swade1987/deprek8ion/tree/master/policies](https://github.com/swade1987/deprek8ion/tree/master/policies)
- Repository metadata file: [https://github.com/swade1987/deprek8ion/blob/master/policies/artifacthub-repo.yml](https://github.com/swade1987/deprek8ion/blob/master/policies/artifacthub-repo.yml)
- Package metadata file: [https://github.com/swade1987/deprek8ion/blob/master/policies/artifacthub-pkg.yml](https://github.com/swade1987/deprek8ion/blob/master/policies/artifacthub-pkg.yml)
- Repository URL used in Artifact Hub: [https://github.com/swade1987/deprek8ion/policies](https://github.com/swade1987/deprek8ion/policies) (please note how the *tree/master* part is not used)
- Policies displayed in Artifact Hub: [https://artifacthub.io/packages/opa/deprek8ion/deprek8ion](https://artifacthub.io/packages/opa/deprek8ion/deprek8ion)

## Tinkerbell actions repositories

Tinkerbell actions repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your packages like it would show in the filesystem.*

The *path to packages* provided can contain one or more packages. Each package version **must** be on a separate folder, and it's up to you to decide if you want to publish one or multiple versions of your package.

The structure of a repository with multiple actions packages and versions could look something like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
├── package1
│   ├── 1.0.0
│   │   └── artifacthub-pkg.yml
│   └── 2.0.0
│       └── artifacthub-pkg.yml
└── package2
    └── 1.0.0
        └── artifacthub-pkg.yml
```

This structure is flexible, and in some cases it can be greatly simplified. In the case of a single package with a single version available at a time (the publisher doesn't want to make previous ones available, for example), the structure could look like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
└── package1
    └── artifacthub-pkg.yml
```

In the previous case, even the `package1` directory could be omitted. The reason is that both packages names and versions are read from the `artifacthub-pkg.yml` metadata file, so directories names are not used at all.

Each package version **needs** an `artifacthub-pkg.yml` metadata file. Please see the file [spec](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml) for more details. The [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file shown above can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at `/path/to/packages`.

Once you have added your repository, you are all set up. As you add new versions of your actions packages or even new packages to your git repository, they'll be automatically indexed and listed in Artifact Hub.

## Tekton tasks repositories

Artifact Hub is able to process Tekton tasks listed in [Tekton catalog repositories](https://github.com/tektoncd/catalog#catalog-structure). Repositories are expected to be hosted in Github or Gitlab. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

For more information about the structure of the Tekton catalog repository, please see the [Tekton catalog](https://github.com/tektoncd/catalog#catalog-structure) official documentation.

Most of the metadata Artifact Hub needs is extracted from the tasks's manifest file. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `task manifest` file. For more information, please see the [Artifact Hub Tekton annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/tekton_annotations.md).

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at the root of the repository.

## Verified Publisher

Repositories and the packages they provide can display a special label named `Verified Publisher`. This label indicates that the repository publisher *owns or has control* over the repository. Users may rely on it to decide if they want to use a given package or not.

Publishers can be verified through the [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file. In the repositories tab in the Artifact Hub control panel, the repository identifier is exposed on each repository's card (ID). To proceed with the verification, an `artifacthub-repo.yml` metadata file must be added to the repository including that **ID** in the `repositoryID` field. The next time the repository is processed, the verification will be checked and the flag will be enabled if it succeeds.

*This feature is not yet available for OCI based repositories.*

*Please note that the **artifacthub-repo.yml** metadata file must be located at the repository URL's path. In Helm repositories, for example, this means it must be located at the same level of the chart repository **index.yaml** file, and it must be served from the chart repository HTTP server as well.*

*The verified publisher flag won't be set until the next time the repository is processed. Please keep in mind that repository won't be processed if it hasn't changed since the last time it was processed. Depending on the repository kind, this is checked in a different way. For Helm http based repositories, we consider it has changed if the `index.yaml` file changes (the `generated` field is ignored when performing this check). For git based repositories, it does when the hash of the last commit in the branch you set up changes.*

## Official status

In Artifact Hub, the `official` status means that the publisher **owns the software deployed** by a package. If we consider the *example* of a [chart used to install Consul](https://artifacthub.io/packages/helm/hashicorp/consul), to obtain the `official` status the publisher should be the owner of the Consul software (HashiCorp in this case), not just the chart.

The `official` status can be granted at the repository or package level. When it is granted for a repository, all packages available on it will display the `official` badge, so all packages in the repository **must** be official. If only some of the packages in your repository are official, please list them in the `Official packages` field when submitting the official status request.

**Before applying for this status, please make sure your repository complies with the following requirements:**

- The repository has already obtained the [Verified Publisher](https://artifacthub.io/docs/topics/repositories/#verified-publisher) status.
- The user requesting the status is the publisher of the repository in Artifact Hub, or belongs to the organization publishing it.
- All official packages available in the repository provide a `README.md` file with some documentation that can be displayed on Artifact Hub.

Once you have verified that the requirements are met, please file an issue [using this template](https://github.com/artifacthub/hub/issues/new?assignees=&labels=official+status+request&template=official-status-request.md&title=%5BOFFICIAL%5D+Your+repository+or+project+name) to apply.

## Ownership claim

Any user is free to add any repository they wish to Artifact Hub. In some situations, legit owners may want to claim its ownership to publish it themselves. This process can be easily done in an automated way from the Artifact Hub control panel.

First, an [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) metadata file must be added to the repository you want to claim the ownership for. Only the `owners` section of the metadata file is required to be set up for this process. The `repositoryID` field can be omitted as the user claiming the ownership doesn't know it yet. The user requesting the ownership **must** appear in the list of owners in the metadata file, and the email listed **must** match with the one used to sign in in Artifact Hub. This information will be used during the process to verify that the requesting user actually owns the repository.

Once the repository metadata file has been set up, you can proceed from the Artifact Hub control panel. In the repositories tab, click on `Claim Ownership`. You'll need to enter the repository you'd like to claim the ownership for, as well as the destination entity, which can be the user performing the request or an organization. If the metadata file was set up correctly, the process should complete successfully.

*This feature is not yet available for OCI based repositories.*

*Please note that the **artifacthub-repo.yml** metadata file must be located at the repository URL's path. In Helm repositories, for example, this means it must be located at the same level of the chart repository **index.yaml** file, and it must be served from the chart repository HTTP server as well.*

## Private repositories

Artifact Hub supports adding private repositories (except OLM OCI based). By default this feature is disabled, but you can enable it in your own Artifact Hub deployment setting the `hub.server.allowPrivateRepositories` configuration setting to `true`. When enabled, you'll be allowed to add the authentication credentials for the repository in the add/update repository modal in the control panel. Credentials are not exposed in the Artifact Hub UI, so users will need to get them separately. The installation instructions modal will display a warning to users when the package displayed belongs to a private repository.

*Please note that this feature is not enabled in `artifacthub.io`.*
