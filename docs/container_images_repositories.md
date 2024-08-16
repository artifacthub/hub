## Container images repositories

*This feature is experimental and it's subject to change.*

Container images repositories are expected to be hosted in OCI registries. Each repository represents one package in Artifact Hub, and multiple versions of that package will be created from each of the tags configured when the repository is added. The repository name in the url will be used as the package name. At the moment tags have to be configured manually from the control panel, and they can be marked as `mutable` or `immutable`. Immutable tags will be only processed once, whereas mutable ones will be processed periodically and reindexed when they change. A repository can have a **maximum of 10 tags** listed. In many cases, adding a single mutable tag like `latest` will be enough to have presence on Artifact Hub.

To add a container image repository, the url used **must** follow the following format:

- `oci://registry/[namespace]/repository` (example: oci://index.docker.io/artifacthub/ah)

The registry host is required and the url should not contain any tag. Please use `index.docker.io` when referring to repositories hosted in the Docker Hub.

### Image metadata

For an image tag to be listed on Artifact Hub, it **must** contain some metadata. Depending on if the image has an index or not, or the image manifest format used, metadata can be provided one way or another:

- Multi-architecture images using the [OCI Index format](https://github.com/opencontainers/image-spec/blob/main/image-index.md) can provide the required metadata [at the index level using annotations](https://github.com/opencontainers/image-spec/blob/main/image-index.md). Metadata at this level takes precedence over metadata at the image level.
- Images using OCI manifests can use [annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md) or [config labels](https://docs.docker.com/engine/reference/builder/#label). If both annotations and labels are provided, annotations will take precedence.
- Docker V2 manifests must use [config labels](https://docs.docker.com/engine/reference/builder/#label).
- Docker V1 manifests are not supported.

The following annotations/labels are supported at the moment:

(all must be provided as strings)

| key                                                  | required | description                                                                                                                                                              |
| ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **io.artifacthub.package.readme-url**                | **yes**  | url of the readme file (in markdown format) for this package version. Please make sure it points to a raw markdown document, not HTML                                    |
| **org.opencontainers.image.created**                 | **yes**  | date and time on which the image was built (RFC3339)                                                                                                                     |
| **org.opencontainers.image.description**             | **yes**  | a short description of the package                                                                                                                                       |
| **org.opencontainers.image.documentation**           | no       | url to get documentation on the image                                                                                                                                    |
| **org.opencontainers.image.source**                  | no       | url to get source code for building the image                                                                                                                            |
| **org.opencontainers.image.title**                   | no       | name of the package nicely formatted                                                                                                                                     |
| **org.opencontainers.image.url**                     | no       | url to find more information on the image                                                                                                                                |
| **org.opencontainers.image.vendor**                  | no       | name of the distributing entity, organization or individual                                                                                                              |
| **org.opencontainers.image.version**                 | no       | version of the packaged software                                                                                                                                         |
| **io.artifacthub.package.alternative-locations**     | no       | alternative locations where this image is hosted. They can be provided as a comma separated list of images urls                                                          |
| **io.artifacthub.package.category**                  | no       | category of the package (ai-machine-learning, database, integration-delivery, monitoring-logging, networking, security, storage, streaming-messaging or skip-prediction) |
| **io.artifacthub.package.contains-security-updates** | no       | boolean that indicates if this image version contains security updates                                                                                                   |
| **io.artifacthub.package.deprecated**                | no       | boolean that indicates if this image version is deprecated                                                                                                               |
| **io.artifacthub.package.keywords**                  | no       | a list of comma separated keywords about this image                                                                                                                      |
| **io.artifacthub.package.license**                   | no       | SPDX identifier of the package license                                                                                                                                   |
| **io.artifacthub.package.logo-url**                  | no       | url of the logo image                                                                                                                                                    |
| **io.artifacthub.package.maintainers**               | no       | json string with an array of maintainers. Example: `[{"name":"maintainer","email":"maintainer@email.com"}]`                                                              |
| **io.artifacthub.package.prerelease**                | no       | boolean that indicates if this image version is a pre-release                                                                                                            |

You can add annotations and labels to your images at build time (by using `podman`, `buildah` or `docker`), or later at any time by mutating the image with tools like [crane](https://github.com/google/go-containerregistry/tree/main/cmd/crane):

```sh
crane mutate \
    --label org.opencontainers.image.description='Artifact Hub command line tool' \
    --label org.opencontainers.image.version='1.6.0' \
    --label org.opencontainers.image.created='2022-02-08T15:38:15Z' \
    --label org.opencontainers.image.documentation='https://artifacthub.io/docs/topics/cli' \
    --label org.opencontainers.image.source='https://github.com/artifacthub/hub/tree/c2a6e0866ab13422221f2f458026b4506acd6b53/cmd/ah' \
    --label org.opencontainers.image.vendor='Artifact Hub' \
    --label io.artifacthub.package.readme-url='https://raw.githubusercontent.com/artifacthub/hub/c2a6e0866ab13422221f2f458026b4506acd6b53/docs/cli.md' \
    --label io.artifacthub.package.maintainers='[{"name":"Artifact Hub maintainers","email":"cncf-artifacthub-maintainers@lists.cncf.io"}]' \
    --label io.artifacthub.package.logo-url='https://raw.githubusercontent.com/artifacthub/hub/master/docs/logo/logo.svg' \
    --label io.artifacthub.package.keywords='artifact hub,cli,lint' \
    --label io.artifacthub.package.license='Apache-2.0' \
    --label io.artifacthub.package.alternative-locations='public.ecr.aws/artifacthub/ah:v1.6.0' \
artifacthub/ah:latest
```

### Repository metadata

There is an Artifact Hub repository metadata file named [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml), which can be used to setup features like [Verified publisher](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#verified-publisher) or [Ownership claim](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#ownership-claim).

Once your repository metadata file is ready, you can push it to the OCI registry using [oras](https://oras.land/cli/):

```bash
oras push \
  registry/namespace/repository:artifacthub.io \
  --config /dev/null:application/vnd.cncf.artifacthub.config.v1+yaml \
  artifacthub-repo.yml:application/vnd.cncf.artifacthub.repository-metadata.layer.v1.yaml
```

or you can use [regclient](https://github.com/regclient/regclient) to do the same:
```bash
regctl artifact put \
  --format '{{ .Manifest.GetDescriptor.Digest }}' \
  --artifact-type application/vnd.cncf.artifacthub.config.v1+yaml \
  -f artifacthub-repo.yml \
  --file-media-type "application/vnd.cncf.artifacthub.repository-metadata.layer.v1.yaml" \
  registry/namespace/repository:artifacthub.io
```

The repository metadata file is pushed to the registry using a special tag named `artifacthub.io`. Artifact Hub will pull that artifact looking for the `application/vnd.cncf.artifacthub.repository-metadata.layer.v1.yaml` layer when the repository metadata is needed.

The [OCI Artifacts support](https://www.docker.com/blog/announcing-docker-hub-oci-artifacts-support/) has been landed on Docker Hub recently, so you can now start publishing your repository metadata file to the Docker Hub without having any problem. You can use the following command to do so:

```bash
oras push \
  docker.io/repository:artifacthub.io \
  --config /dev/null:application/vnd.cncf.artifacthub.config.v1+yaml \
  artifacthub-repo.yml:application/vnd.cncf.artifacthub.repository-metadata.layer.v1.yaml
```

or you can use [regclient](https://github.com/regclient/regclient) to do the same:

```bash
regctl artifact put \
  --format '{{ .Manifest.GetDescriptor.Digest }}' \
  --artifact-type application/vnd.cncf.artifacthub.config.v1+yaml \
  -f artifacthub-repo.yml \
  --file-media-type "application/vnd.cncf.artifacthub.repository-metadata.layer.v1.yaml" \
  docker.io/repository:artifacthub.io
```

*Please note that publishing an Artifact Hub repository metadata file requires that the registry supports [OCI artifacts](https://oras.land/implementors/).*
