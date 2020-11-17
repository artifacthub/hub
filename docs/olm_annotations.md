# Artifact Hub annotations in OLM operator CSV file

Artifact Hub uses the metadata in the operator's `CSV` file to populate the information for a package of kind OLM. Usually most of the information needed is already there, so there is no extra work required by maintainers to list them on Artifact Hub.

However, sometimes there might be cases in which it may be useful to provide some more context that helps improving users' experience in Artifact Hub. This can be done using some special **annotations** in the [CSV](https://github.com/operator-framework/community-operators/blob/master/docs/required-fields.md) file.

## Supported annotations

- **artifacthub.io/changes** *(yaml string, see example below)*

This annotation is used to provide some details about the changes introduced by a given operator version. Artifact Hub can generate and display a **ChangeLog** based on the entries in the `changes` field in all your operator versions. You can see an example of how the changelog would look like in the Artifact Hub UI [here](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=changelog).

- **artifacthub.io/imagesWhitelist** *(yaml string, see example below)*

Use this annotation to provide a list of the images that should not be scanned for security vulnerabilities.

- **artifacthub.io/license** *(string)*

Use this annotation to indicate the operator's license. It must be a valid [SPDX identifier](https://spdx.org/licenses/).

## Example

Artifact Hub annotations in `CSV` file:

```yaml
metadata:
  annotations:
    artifacthub.io/changes: |
      - Added cool feature
      - Fixed minor bug
    artifacthub.io/imagesWhitelist: |
      - repo/img2:2.0.0
      - repo/img3:3.0.0
    artifacthub.io/license: Apache-2.0
spec:
    ...
```
