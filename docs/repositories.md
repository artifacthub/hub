# Repositories guide

Artifact Hub allows publishers to list their content in an automated way. Publishers can add their repositories from the control panel, accesible from the top right menu after signing in. It's possible to create an organization and add repositories to it instead of adding them to the user account. Repositories will be indexed periodically to always display the most up-to-date content.

The following repositories kinds are supported at the moment:

- [Falco rules repositories](#falco-rules-repositories)
- [Helm charts repositories](#helm-charts-repositories)
- [OLM operators repositories](#olm-operators-repositories)
- [OPA policies repositories](#opa-policies-repositories)

## Falco rules repositories

Falco rules repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your packages like it would show in the filesystem.*

Falco rules packages are defined using YAML files, following the [same spec the Cloud Native Security Hub](https://github.com/falcosecurity/cloud-native-security-hub#adding-a-new-falco-rule) uses. Each package version must be defined in a file with `.yaml` extension. The `/path/to/packages` provided will be processed recursively to find all packages' versions available.

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at `/path/to/packages`.

*NOTE: we are planning to also support the same structure and metadata files used in [OPA policies repositories](#opa-policies-repositories) for Falco rules repositories.*

### Example repository: Security Hub

- Policies source Github URL: [https://github.com/falcosecurity/cloud-native-security-hub/tree/master/resources/falco](https://github.com/falcosecurity/cloud-native-security-hub/tree/master/resources/falco)
- Repository URL used in Artifact Hub: [https://github.com/falcosecurity/cloud-native-security-hub/resources/falco](https://github.com/falcosecurity/cloud-native-security-hub/resources/falco) (please note how the *tree/master* part is not used)
- Repository packages in Artifact Hub: [https://artifacthub.io/packages/search?page=1&repo=security-hub](https://artifacthub.io/packages/search?page=1&repo=security-hub)
- Sample package in Artifact Hub: [https://artifacthub.io/packages/falco/security-hub/apache](https://artifacthub.io/packages/falco/security-hub/apache)

## Helm charts repositories

Artifact Hub is able to process chart repositories as defined by the Helm project. For more information about the repository structure and different options to host your own, please check their [documentation](https://helm.sh/docs/topics/chart_repository/).

Most of the metadata Artifact Hub needs is extracted from the `Chart.yaml` file and other files in the chart package, like the `README` or `LICENSE` files. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `Chart.yaml` file. For more information, please see the [Artifact Hub Helm annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/helm_annotations.md).

There is an extra metadata file that you can add at the root of your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim).

Once you have added your repository, you are all set up. As you add new versions of your charts or even new charts to your repository, they'll be automatically indexed and listed in Artifact Hub.

## OLM operators repositories

OLM operators repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/operators]`
- `https://gitlab.com/user/repo[/path/to/operators]`

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your operators like it would show in the filesystem.*

The *path to operators* provided can contain one or more operators, that **must** be packaged using the [format defined in the Operator Framework documentation](https://github.com/operator-framework/community-operators/blob/master/docs/contributing.md#packaging-format). This is exactly the same format required to publish operators in [operatorhub.io](https://operatorhub.io). We've adopted this format for this repository kind because of its well thought structure and to make it easier for publishers to start listing their content in Artifact Hub.

Most of the metadata Artifact Hub needs is extracted from the `CSV` file and other files in the operator package. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `CSV` file. For more information, please see the [Artifact Hub OLM annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/olm_annotations.md).

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified Publisher](#verified-publisher) or [Ownership claim](#ownership-claim). This file must be located at `/path/to/operators`.

Once you have added your repository, you are all set up. As you add new versions of your operators or even new operators to your git repository, they'll be automatically indexed and listed in Artifact Hub. To delete a specific version or operator from Artifact Hub, you just need to delete the corresponding directory from your repository. This should make it easier to keep your content up-to-date in Artifact Hub without requiring any extra effort on your side.

### Example repository: Ditto operator repository

- Operators source Github URL: [https://github.com/ctron/ditto-operator/tree/master/olm](https://github.com/ctron/ditto-operator/tree/master/olm)
- Repository URL used in Artifact Hub: [https://github.com/ctron/ditto-operator/olm](https://github.com/ctron/ditto-operator/olm) (please note how the *tree/master* part is not used)
- Operator displayed in Artifact Hub: [https://artifacthub.io/packages/olm/ditto-operator/ditto-operator](https://artifacthub.io/packages/olm/ditto-operator/ditto-operator)

## OPA policies repositories

OPA policies repositories are expected to be hosted in Github or Gitlab repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your packages like it would show in the filesystem.*

The *path to packages* provided can contain one or more packages. You can have multiple policies in a single package, or create a package for each policy, it's completely up to you. In the same way, you can decide if you want to provide one or multiple versions of your policies packages.

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

## Verified Publisher

Repositories and the packages they provide can display a special label named `Verified Publisher`. This label indicates that the repository publisher *owns or has control* over the repository. Users may rely on it to decide if they want to use a given package or not.

Publishers can be verified through the [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file. In the repositories tab in the Artifact Hub control panel, the repository identifier is exposed on each repository's card (ID). To proceed with the verification, an `artifacthub-repo.yml` metadata file must be added to the repository including that **ID** in the `repositoryID` field. The next time the repository is processed, the verification will be checked and the flag will be enabled if it succeeds.

*Please note that the **artifacthub-repo.yml** metadata file must be located at the same level of the chart repository **index.yaml**, and it must be served from the chart repository HTTP server as well. This means that depending on how your chart repository is set up, adding it to the source git repository may not be enough.*

## Ownership claim

Any user is free to add any repository they wish to Artifact Hub. In some situations, legit owners may want to claim its ownership to publish it themselves. This process can be easily done in an automated way from the Artifact Hub control panel.

First, an [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) metadata file must be added to the repository you want to claim the ownership for. Only the `owners` section of the metadata file is required to be set up for this process. The `repositoryID` field can be omitted as the user claiming the ownership doesn't know it yet. The user requesting the ownership **must** appear in the list of owners in the metadata file, and the email listed **must** match with the one used to sign in in Artifact Hub. This information will be used during the process to verify that the requesting user actually owns the repository.

Once the repository metadata file has been set up, you can proceed from the Artifact Hub control panel. In the repositories tab, click on `Claim Ownership`. You'll need to enter the repository you'd like to claim the ownership for, as well as the destination entity, which can be the user performing the request or an organization. If the metadata file was set up correctly, the process should complete successfully.

*Please note that the **artifacthub-repo.yml** metadata file must be located at the same level of the chart repository **index.yaml**, and it must be served from the chart repository HTTP server as well. This means that depending on how your chart repository is set up, adding it to the source git repository may not be enough.*

## Private repositories

Artifact Hub supports adding private Helm repositories. By default this feature is disabled, but you can enable it in your own Artifact Hub deployment setting the `hub.server.allowPrivateRepositories` configuration setting to `true`. When enabled, you'll be allowed to add the basic auth credentials for the repository in the add/update repository modal in the control panel. Credentials are not exposed in the Artifact Hub UI, so users will need to get them separately. The installation instructions modal will display a warning to users when the package displayed belongs to a private repository.

*Please note that this feature is not enabled in `artifacthub.io`.*
