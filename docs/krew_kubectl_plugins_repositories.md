## Krew kubectl plugins repositories

Artifact Hub is able to process kubectl plugins listed in [Krew index repositories](https://krew.sigs.k8s.io/docs/developer-guide/custom-indexes/). Repositories are expected to be hosted in GitHub, GitLab or Bitbucket. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo`
- `https://gitlab.com/user/repo`
- `https://bitbucket.org/user/repo`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

For more information about the structure of the Krew index repository, please see the [Hosting Custom Plugin Indexes](https://krew.sigs.k8s.io/docs/developer-guide/custom-indexes/) official documentation.

Most of the metadata Artifact Hub needs is extracted from the [plugin's manifest](https://krew.sigs.k8s.io/docs/developer-guide/plugin-manifest/) file. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `plugin manifest` file. For more information, please see the [Artifact Hub Krew annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/krew_annotations.md).

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified publisher](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#verified-publisher) or [Ownership claim](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#ownership-claim). This file must be located at the root of the repository.

### Example repository: Krew Index

- [https://github.com/kubernetes-sigs/krew-index](https://github.com/kubernetes-sigs/krew-index)
