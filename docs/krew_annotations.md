# Artifact Hub annotations in Krew plugin manifest file

Artifact Hub uses some data from the `plugin's manifest file` to populate the information for a package of kind Krew. Usually most of the information needed is already there, so there is no extra work required by maintainers to list their plugins on Artifact Hub.

However, sometimes there might be cases in which it may be useful to provide some more context that helps improving users' experience in Artifact Hub. This can be done using some special **annotations** in the [plugin's manifest](https://krew.sigs.k8s.io/docs/developer-guide/plugin-manifest/) file.

## Supported annotations

- **artifacthub.io/displayName** *(string)*

This annotations allows providing a nicely formatted name for the package.

- **artifacthub.io/keywords** *(yaml string, see example below)*

Use this annotation to provide a list of keywords that are relevant to your package. Keywords may improve the visibility of your package, making it appear in search results and in the related packages section. By default, the `kubernetes`, `kubectl` and `plugin` keywords are added to packages of Krew kind.

- **artifacthub.io/license** *(string)*

Use this annotation to indicate the plugin's license. It must be a valid [SPDX identifier](https://spdx.org/licenses/).

- **artifacthub.io/links** *(yaml string, see example below)*

This annotation allows including named links, which will be rendered nicely in Artifact Hub.

- **artifacthub.io/maintainers** *(yaml string, see example below)*

Use this annotation to list the maintainers of this package. Please note that the `email` field is *required* and entries that do not contain it will be silently ignored.

- **artifacthub.io/provider** *(string)*

Use this annotation to indicate the name of the organization or user providing this plugin. This may be useful for repositories where plugins are provided by a different entity than the one publishing them in Artifact Hub.

- **artifacthub.io/readme** *(string)*

Each package in Artifact Hub is expected to provide a `readme` file that is rendered in the package view of the UI. By default, the content of the `spec.description` field in the [plugin's manifest](https://krew.sigs.k8s.io/docs/developer-guide/plugin-manifest/) file is used as the readme file.

This annotation allows providing an Artifact Hub specific readme file in markdown format.

- **artifacthub.io/recommendations** *(yaml string, see example below)*

This annotation allows recommending other related packages. Recommended packages will be featured in the package detail view in Artifact Hub.

## Example

Artifact Hub annotations in `plugin manifest` file:

```yaml
metadata:
  annotations:
    artifacthub.io/displayName: My plugin
    artifacthub.io/keywords: |
      - networking
      - security
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
    artifacthub.io/readme: |
      ## Package documentation in markdown format

      Content added here will be displayed when the package's view in the UI.
    artifacthub.io/recommendations: |
      - url: https://artifacthub.io/packages/helm/artifact-hub/artifact-hub
      - url: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack
spec:
    ...
```
