# Packages security report

Artifact Hub scans containers' images used by packages for security vulnerabilities. The scanner uses [Trivy](https://github.com/aquasecurity/trivy) to generate security reports for each of the package's versions. These reports are accessible from the package's detail view.

Security reports are generated *periodically*. The scanner runs *twice an hour* and scans packages' versions **that haven't been scanned yet**. Packages' versions already scanned are revisited and **scanned again**, just in case new vulnerabilities have been discovered since the previous scan. The latest package version available is scanned **daily**, whereas previous versions are scanned **weekly**. This happens even if nothing has changed in the package version.

The security report may contain multiple images sections, one for each of the images your package is listing. Within each image section, multiple targets can be listed as well. A common one is the OS used by the image, including the packages installed. But more targets can be scanned and displayed if files describing your [application dependencies](#application-dependencies) are found in the image.

## Packages containers images

To generate a security report of your package, it needs to include the containers images it uses. The location of this information varies from one package kind to another.

### Helm charts

Images used by a Helm chart can be listed including a special annotation called `artifacthub.io/images` in the `Chart.yaml` file. You can find an example of how this is done in the Artifact Hub Helm chart [here](https://github.com/artifacthub/hub/blob/a3ffcb7cee0aa3923c3e4cf9bcf8ac0f2f437a2b/charts/artifact-hub/Chart.yaml#L25-L34). For more information please see the Artifact Hub [Helm annotations](https://github.com/artifacthub/hub/blob/master/docs/helm_annotations.md) documentation. The way this works may change when [Helm defines an official way to list the images](https://github.com/helm/helm/issues/7754).

### OLM operators

The image used by an OLM operator is extracted from the `containerImage` annotation in the [CSV file metadata section](https://github.com/operator-framework/community-operators/blob/master/docs/required-fields.md#required-fields-for-operatorhub). Most of the OLM operators currently listed in Artifact Hub provide that information already, so security reports for them are already available in Artifact Hub with no extra effort required.

### OPA policies

Images used by a package containing OPA policies can be listed using the `containersImages` field in the package's `artifacthub-pkg.yml` [metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml).

### Tinkerbell actions

Images used by a package containing Tinkerbell actions can be listed using the `containersImages` field in the package's `artifacthub-pkg.yml` [metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml).

## Application dependencies

Trivy also scans [applications dependencies](https://aquasecurity.github.io/trivy/v0.17.2/vuln-detection/library/) for vulnerabilities. To do that, it inspects the files that contain the applications dependencies and the versions used.

The following dependencies files are supported at the moment:

- Ruby
  - Gemfile.lock
- Python
  - Pipfile.lock
  - poetry.lock
- PHP
  - composer.lock
- Node.js
  - package-lock.json
  - yarn.lock
- Rust
  - Cargo.lock
- .NET
  - packages.lock.json
- Java
  - JAR/WAR/EAR files (.jar, .war, and *.ear)
- Go
  - Binaries built by Go (UPX-compressed binaries don't work)

If you want your application dependencies scanned, please make sure the relevant files are included in your final images. The security report will include a target for each of them. You can find an example of how this is done in one of the Artifact Hub images [here](https://github.com/artifacthub/hub/blob/a3ffcb7cee0aa3923c3e4cf9bcf8ac0f2f437a2b/cmd/hub/Dockerfile#L23).

## FAQ

- *I can't see the security report for my package*

Please make sure your images are **publicly available**. If your repository has just been added to Artifact Hub, it may take up to *30 mins* for it to be indexed. Once it has been indexed, it may take up to *15 extra minutes* for the initial security report of your packages to be generated. If you don't see it after **an hour** and the images your package lists meet the requirements, please file an [issue](https://github.com/artifacthub/hub/issues).
