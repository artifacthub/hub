# Keptn annotations

You can provide some extra information about your Keptn integrations by using the `annotations` field in the [Artifact Hub package metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml).

## Supported annotations

- **keptn/kind** *(string)*

This annotation allows providing the kind of the integration. Supported values: *webhook*, *testing*, *deployment*, *notification*, *observability*, *remediation*, *sli-provider*, *finops* and *security*. It's possible to add multiple kinds by using a comma separated list, like shown in the example below.

- **keptn/version** *(string)*

Use this annotation to provide the Keptn version(s) your integration is compatible with.

## Example

```yaml
...
annotations:
  keptn/kind: "webhook,testing"
  keptn/version: "0.10.0-0.12.0"
```
