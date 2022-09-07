## Tekton tasks repositories

Artifact Hub is able to process Tekton tasks listed in [Tekton catalog repositories](https://github.com/tektoncd/catalog#catalog-structure). Repositories are expected to be hosted in GitHub, GitLab or Bitbucket. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`
- `https://bitbucket.org/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

For more information about the structure of the Tekton catalog repository, please see the [Tekton catalog](https://github.com/tektoncd/catalog#catalog-structure) official documentation.

Most of the metadata Artifact Hub needs is extracted from the task's manifest file. However, there is some extra Artifact Hub specific metadata that you can set using some special annotations in the `manifest` file. For more information, please see the [Artifact Hub Tekton annotations documentation](https://github.com/artifacthub/hub/blob/master/docs/tekton_annotations.md).

There is an extra metadata file that you can add to your repository named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified publisher](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#verified-publisher) or [Ownership claim](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#ownership-claim). This file must be located at the root of the repository.

### Example repository: Tekton Catalog Tasks

- Tasks source GitHub URL: [https://github.com/tektoncd/catalog/tree/main/task](https://github.com/tektoncd/catalog/tree/main/task)
- Repository URL used in Artifact Hub: `https://github.com/tektoncd/catalog/task` (please note how the *tree/main* part is not used)
