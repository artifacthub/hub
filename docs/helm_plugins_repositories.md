## Helm plugins repositories

Artifact Hub is able to process Helm plugins available in git repositories. Repositories are expected to be hosted in GitHub, GitLab or Bitbucket. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo`
- `https://gitlab.com/user/repo`
- `https://bitbucket.org/user/repo`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

For more information about the structure of the plugins repository, please see the [Helm plugins guide](https://helm.sh/docs/topics/plugins/#building-plugins).

Most of the metadata Artifact Hub needs is extracted from the [plugin's metadata](https://helm.sh/docs/topics/plugins/#building-plugins) file. In addition to that, if a `README.md` file is available in the plugin's directory, it'll be used as the package documentation. In the same way, if a `LICENSE.*` file is available in the plugin's directory, Artifact Hub will try to detect the license used and its [SPDX identifier](https://spdx.org/licenses/) will be stored.

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified publisher](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#verified-publisher) or [Ownership claim](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#ownership-claim). This file must be located at the root of the repository.

### Some example repositories

- [https://github.com/helm/helm-2to3](https://github.com/helm/helm-2to3)
- [https://github.com/databus23/helm-diff](https://github.com/databus23/helm-diff)
- [https://github.com/ContainerSolutions/helm-monitor](https://github.com/ContainerSolutions/helm-monitor)
