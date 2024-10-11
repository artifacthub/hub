# Packages security report

Artifact Hub scans containers' images used by packages for security vulnerabilities. The scanner uses [Trivy](https://github.com/aquasecurity/trivy) to generate security reports for each of the package's versions. These reports are accessible from the package's detail view.

Security reports are generated *periodically*. The scanner runs *twice an hour* and scans packages' versions **that haven't been scanned yet**. Packages' versions already scanned are revisited and **scanned again**, just in case new vulnerabilities have been discovered since the previous scan. The latest package version available is scanned **daily**, whereas previous versions are scanned **weekly**. This happens even if nothing has changed in the package version. Versions released more than **one year** ago or with more than **15 container images** won't be scanned.

The security report may contain multiple images sections, one for each of the images your package is listing. Within each image section, multiple targets can be listed as well. A common one is the OS used by the image, including the packages installed. But more targets can be scanned and displayed if files describing your [application dependencies](#application-dependencies) are found in the image.

## Packages containers images

To generate a security report of your package, it needs to include the containers images it uses. The location of this information varies from one package kind to another.

### Helm charts

Artifact Hub will try to extract the containers images used by Helm charts from the manifests generated from a dry-run install using the default values. Alternatively, images used by a Helm chart can be listed including a special annotation called `artifacthub.io/images` in the `Chart.yaml` file. You can find an example of how this is done in the Artifact Hub Helm chart [here](https://github.com/artifacthub/hub/blob/a3ffcb7cee0aa3923c3e4cf9bcf8ac0f2f437a2b/charts/artifact-hub/Chart.yaml#L25-L34). For more information please see the Artifact Hub [Helm annotations](https://github.com/artifacthub/hub/blob/master/docs/helm_annotations.md) documentation.

### OLM operators

The images used by an OLM operator are extracted from the `containerImage` annotation in the [CSV file metadata section](https://github.com/operator-framework/community-operators/blob/master/docs/packaging-required-fields.md), as well as from the `related images` section in the CSV spec. Most of the OLM operators currently listed in Artifact Hub provide that information already, so security reports for them are already available in Artifact Hub with no extra effort required.

### Tekton tasks, pipelines and stepactions

The images used by Tekton tasks, pipelines and stepactions are extracted from the [`task.step.image`](https://github.com/tektoncd/pipeline/blob/main/docs/tasks.md#running-scripts-within-steps) fields of the resource yaml file. If the `image` value is specified by [`params`](https://github.com/tektoncd/pipeline/blob/main/docs/tasks.md#specifying-parameters), the default value of the params (if provided) is used to run the security report. You can find examples with explanations [here](https://github.com/tektoncd/community/blob/main/teps/0079-tekton-catalog-support-tiers.md#extract-container-images-from-catalogs). Please note that the security reports do not include user-provided container images if the default value of the image `params` are overwritten by `pipelineRun` or `taskRun` at run time.

### CoreDNS plugins, KEDA scalers, Keptn integrations, OPA policies and Tinkerbell actions

Images used by these kinds of packages can be listed using the `containersImages` field in the package's `artifacthub-pkg.yml` [metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml).

## Application dependencies

Trivy also scans [applications dependencies](https://aquasecurity.github.io/trivy/v0.56/docs/scanner/vulnerability/#language-specific-packages) for vulnerabilities. To do that, it inspects the files that contain the applications dependencies and the versions used. Please see the [language-specific packages](https://aquasecurity.github.io/trivy/v0.56/docs/scanner/vulnerability/#language-specific-packages) section in the Trivy documentation (image column) for a full list of the applications dependencies supported.

If you want your application dependencies scanned, please make sure the relevant files are included in your final images. The security report will include a target for each of them.

## FAQ

- *I can't see the security report for my package*

Please make sure your images are **publicly available**. If your repository has just been added to Artifact Hub, it may take up to *30 mins* for it to be indexed. Once it has been indexed, it may take up to *15 extra minutes* for the initial security report of your packages to be generated. If you don't see it after **an hour** and the images your package lists meet the requirements, please file an [issue](https://github.com/artifacthub/hub/issues).
