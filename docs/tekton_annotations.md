# Artifact Hub annotations in Tekton task manifest file

Artifact Hub uses some data from the `task manifest file` to populate the information for a package of kind Tekton task. Usually most of the information needed is already there, so there is no extra work required by maintainers to list their tasks on Artifact Hub.

However, sometimes there might be cases in which it may be useful to provide some more context that helps improving users' experience in Artifact Hub. This can be done using some special **annotations** in the [task's manifest](https://github.com/tektoncd/catalog#catalog-structure) file.

## Supported annotations

- **artifacthub.io/changes** *(yaml string, see example below)*

This annotation is used to provide some details about the changes introduced by a given task version. Artifact Hub can generate and display a **ChangeLog** based on the entries in the `changes` field in all your task versions. You can see an example of how the changelog would look like in the Artifact Hub UI [here](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=changelog).

This annotation can be provided using two different formats: using a plain list of strings with the description of the change or using a list of objects with some extra structured information (see example below). Please feel free to use the one that better suits your needs. The UI experience will be slightly different depending on the choice. When using the *list of objects* option the valid **supported kinds** are *added*, *changed*, *deprecated*, *removed*, *fixed* and *security*.

- **artifacthub.io/license** *(string)*

Use this annotation to indicate the package's license. It must be a valid [SPDX identifier](https://spdx.org/licenses/).

- **artifacthub.io/links** *(yaml string, see example below)*

This annotation allows including named links, which will be rendered nicely in Artifact Hub. By default, a link pointing to the source code of the task will be automatically added.

- **artifacthub.io/maintainers** *(yaml string, see example below)*

Use this annotation to list the maintainers of this package. Please note that the `email` field is *required* and entries that do not contain it will be silently ignored.

- **artifacthub.io/provider** *(string)*

Use this annotation to indicate the name of the organization or user providing this package. This may be useful for repositories where packages are provided by a different entity than the one publishing them in Artifact Hub.

- **artifacthub.io/recommendations** *(yaml string, see example below)*

This annotation allows recommending other related packages. Recommended packages will be featured in the package detail view in Artifact Hub.

## Example

Artifact Hub annotations in `task manifest` file:

```yaml
metadata:
  annotations:
    artifacthub.io/changes: |
      - Added cool feature
      - Fixed minor bug
    artifacthub.io/changes: |
      - kind: added
        description: Cool feature
        links:
          - name: Github Issue
            url: https://github.com/issue-url
          - name: Github PR
            url: https://github.com/pr-url
      - kind: fixed
        description: Minor bug
        links:
          - name: Github Issue
            url: https://github.com/issue-url
    artifacthub.io/license: Apache-2.0
    artifacthub.io/links: |
      - name: link1
        url: https://link1.url
      - name: link2
        url: https://link2.url
    artifacthub.io/maintainers: |
      - name: user1
        email: user1@email.com
      - name: user2
        email: user2@email.com
    artifacthub.io/provider: Some organization
    artifacthub.io/recommendations: |
      - url: https://artifacthub.io/packages/helm/artifact-hub/artifact-hub
      - url: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack
spec:
    ...
```
