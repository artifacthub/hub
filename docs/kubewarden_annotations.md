# Kubewarden annotations

You can provide some extra information about your Kubewarden policies by using the `annotations` field in the [Artifact Hub package metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml).

## Supported annotations

- **kubewarden/mutation** *(string)*

Use this annotation to indicate if the policy can mutate incoming requests.

- **kubewarden/resources** *(string)*

Comma separated list of Kubernetes resources evaluated by the policy.

## Example

```yaml
...
annotations:
  kubewarden/mutation: "true"
  kubewarden/resources: "Pod"
```
