# Kyverno annotations

You can provide some extra information about your Kyverno policies by using the `annotations` field in the [Artifact Hub package metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml).

## Supported annotations

- **kyverno/category** *(string)*

Category the policy fits in. Unless the policy applies to a community or "external" Kubernetes project, use other.

- **kyverno/kubernetesVersion** *(string)*

Version(s) of Kubernetes against which the policy should work. Value should ideally be a range of versions no more than two prior (ex., 1.19-1.21) and must be enclosed in quotes.

- **kyverno/subject** *(string)*

The focus of the policy. For example, Pod or Ingress or a CustomResource like ClusterIssuer. The subject is the "thing" on which the policy operates. For multiple, use a comma-separated string like Pod, Deployment.

- **kyverno/version** *(string)*

Minimum version of Kyverno where this policy works. Note that this isn't the version of Kyverno where it was developed or tested but the minimum version of Kyverno where it's supported. If unknown, omit.

## Example

```yaml
...
annotations:
  kyverno/category: "OpenShift"
  kyverno/kubernetesVersion: "1.20"
  kyverno/subject: "Route"
  kyverno/version: "1.6.0"
```
