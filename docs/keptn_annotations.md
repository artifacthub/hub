# Keptn annotations

You can provide some extra information about your Keptn integrations by using the `annotations` field in the [Artifact Hub package metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml).

## Supported annotations

- **keptn/kind** *(string)*

This annotation allows providing the kind of the integration. Supported values: *service* and *sli-provider*. It's possible to add multiple kinds by using a comma separated list, like shown in the example below.

- **keptn/version** *(string)*

Use this annotation to provide the Keptn version(s) your integration is compatible with.

## Example

```yaml
...
annotations:
  keptn/kind: "service,sli-provider"
  keptn/version: "0.8.4-0.8.7"
```
