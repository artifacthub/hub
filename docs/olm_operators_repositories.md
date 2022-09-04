## OLM operators repositories

OLM operators repositories are expected to be hosted in GitHub, GitLab or Bitbucket repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`
- `https://bitbucket.org/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your operators like it would show in the filesystem.*

The *path to operators* provided can contain one or more operators, that **must** be packaged using the [format defined in the Operator Framework documentation](https://github.com/operator-framework/community-operators/blob/master/docs/packaging-operator.md). This is exactly the same format required to publish operators in [operatorhub.io](https://operatorhub.io). We've adopted this format for this repository kind because of its well thought structure and to make it easier for publishers to start listing their content in Artifact Hub. Both `PackageManifest` and `Bundle` formats are supported.

Most of the metadata Artifact Hub needs is extracted from the [CSV](https://github.com/operator-framework/operator-lifecycle-manager/blob/master/doc/design/building-your-csv.md) file and other files in the operator package. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `CSV` file. For more information, please see the [Artifact Hub OLM annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/olm_annotations.md).

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified publisher](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#verified-publisher) or [Ownership claim](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#ownership-claim). This file must be located at `/path/to/packages`.

Once you have added your repository, you are all set up. As you add new versions of your operators or even new operators to your git repository, they'll be automatically indexed and listed in Artifact Hub. To delete a specific version or operator from Artifact Hub, you just need to delete the corresponding directory from your repository. This should make it easier to keep your content up-to-date in Artifact Hub without requiring any extra effort on your side.

### OLM OCI experimental support

Artifact Hub is able to process OLM repositories stored in [OCI registries](https://github.com/opencontainers/distribution-spec/blob/master/spec.md). This feature is experimental, and it's subject to change when [some enhancements are incorporated into the Operator Framework](https://github.com/operator-framework/enhancements/pull/37).

To add a repository stored in a OCI registry, you need to provide the **catalog index image** url when registering your repository. The url used **must** follow the following format:

- `oci://docker.io/ibmcom/ibm-operator-catalog:latest`

OCI specific installation instructions will be provided in the UI for packages available in OCI registries.

Please note that there are some features that are not yet available for OLM repositories stored in OCI registries:

- [Verified publisher](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#verified-publisher)
- [Ownership claim](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#ownership-claim)

### Example repository: Ditto operator repository

- Operators source GitHub URL: [https://github.com/ctron/ditto-operator/tree/master/olm](https://github.com/ctron/ditto-operator/tree/master/olm)
- Repository URL used in Artifact Hub: `https://github.com/ctron/ditto-operator/olm` (please note how the *tree/master* part is not used)
- Operator displayed in Artifact Hub: [https://artifacthub.io/packages/olm/ditto-operator/ditto-operator](https://artifacthub.io/packages/olm/ditto-operator/ditto-operator)
