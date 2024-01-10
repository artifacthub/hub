# Headlamp annotations

You can provide some extra information about your Headlamp plugins by using the `annotations` field in the [Artifact Hub package metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml).

## Supported annotations

- **headlamp/plugin/archive-url** *(string, required)*

Plugin archive tarball URL (e.g. "https://.../my-archive.tar.gz").

- **headlamp/plugin/archive-checksum** *(string, required)*

Plugin archive tarball checksum (e.g. "sha256:MY_CHECKSUM").

- **headlamp/plugin/version-compat** *(string, optional)*

Headlamp versions this plugin is compatible with (e.g. ">=1.2.3").

- **headlamp/plugin/distro-compat** *(string, optional)*

Headlamp flavor this plugin is compatible with (e.g. one or more of app, in-cluster, web, docker-desktop, linux, windows, mac).

## Example

```yaml
...
annotations:
  headlamp/plugin/archive-url: "https://.../my-archive.tar.gz"
  headlamp/plugin/archive-checksum: "sha256:MY_CHECKSUM"
  headlamp/plugin/version-compat: ">=1.2.3"
  headlamp/plugin/distro-compat: "in-cluster,web,docker-desktop"
```
