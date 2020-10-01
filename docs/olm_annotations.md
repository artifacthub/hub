# Artifact Hub annotations in OLM operator CSV file

Artifact Hub uses the metadata in the operator's `CSV` file to populate the information for a package of kind OLM. Usually most of the information needed is already there, so there is no extra work required by maintainers to list them on Artifact Hub.

However, sometimes there might be cases in which it may be useful to provide some more context that helps improving users' experience in Artifact Hub. This can be done using some special **annotations** in the [CSV](https://github.com/operator-framework/community-operators/blob/master/docs/required-fields.md) file.

## Supported annotations

- **artifacthub.io/license** *(string)*

Use this annotation to indicate the operator's license. It must be a valid SPDX identifier (https://spdx.org/licenses/).

## Example

Artifact Hub annotations in `CSV` file:

```yaml
metadata:
  annotations:
    artifacthub.io/license: Apache-2.0
spec:
    ...
```
