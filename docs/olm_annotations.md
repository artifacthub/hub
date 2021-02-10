# Artifact Hub annotations in OLM operator CSV file

Artifact Hub uses the metadata in the operator's `CSV` file to populate the information for a package of kind OLM. Usually most of the information needed is already there, so there is no extra work required by maintainers to list them on Artifact Hub.

However, sometimes there might be cases in which it may be useful to provide some more context that helps improving users' experience in Artifact Hub. This can be done using some special **annotations** in the [CSV](https://github.com/operator-framework/community-operators/blob/master/docs/required-fields.md) file.

## Supported annotations

- **artifacthub.io/changes** *(yaml string, see example below)*

This annotation is used to provide some details about the changes introduced by a given operator version. Artifact Hub can generate and display a **ChangeLog** based on the entries in the `changes` field in all your operator versions. You can see an example of how the changelog would look like in the Artifact Hub UI [here](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=changelog).

- **artifacthub.io/containsSecurityUpdates** *(boolean string, see example below)*

Use this annotation to indicate that this operator version contains security updates. When a package release contains security updates, a special message will be displayed in the Artifact Hub UI as well as in the new release email notification.

- **artifacthub.io/imagesWhitelist** *(yaml string, see example below)*

Use this annotation to provide a list of the images that should not be scanned for security vulnerabilities.

- **artifacthub.io/install** *(yaml string, see example below)*

This annotation can be used to provide custom installation instructions for your package. They **must** be in markdown format.

- **artifacthub.io/license** *(string)*

Use this annotation to indicate the operator's license. It must be a valid [SPDX identifier](https://spdx.org/licenses/).

- **artifacthub.io/prerelease** *(boolean string, see example below)*

Use this annotation to indicate that this operator version is a pre-release. This status will be displayed in the UI's package view, as well as in new releases notifications emails.

- **artifacthub.io/recommendations** *(yaml string, see example below)*

This annotation allows recommending other related packages. Recommended packages will be featured in the package detail view in Artifact Hub.

## Example

Artifact Hub annotations in `CSV` file:

```yaml
metadata:
  annotations:
    artifacthub.io/changes: |
      - Added cool feature
      - Fixed minor bug
    artifacthub.io/containsSecurityUpdates: "true"
    artifacthub.io/imagesWhitelist: |
      - repo/img2:2.0.0
      - repo/img3:3.0.0
    artifacthub.io/install: |
      Brief install instructions in markdown format

      Content added here will be displayed when the INSTALL button on the package details page is clicked.
    artifacthub.io/license: Apache-2.0
    artifacthub.io/prerelease: "false"
    artifacthub.io/recommendations: |
      - url: https://artifacthub.io/packages/helm/artifact-hub/artifact-hub
      - url: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack
spec:
    ...
```
