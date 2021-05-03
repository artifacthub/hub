# Artifact Hub annotations in Helm Chart.yaml file

Artifact Hub uses the metadata in the chart's `Chart.yaml` file to populate the information for a package of kind Helm. Usually most of the information needed is already there, so there is no extra work required by charts maintainers to list them on Artifact Hub.

However, sometimes there might be cases in which it may be useful to provide some more context that helps improving users' experience in Artifact Hub. This can be done using some special **annotations** in the [Chart.yaml](https://helm.sh/docs/topics/charts/#the-chartyaml-file) file.

## Supported annotations

- **artifacthub.io/changes** *(yaml string, see example below)*

This annotation is used to provide some details about the changes introduced by a given chart version. Artifact Hub can generate and display a **ChangeLog** based on the entries in the `changes` field in all your chart versions. You can see an example of how the changelog would look like in the Artifact Hub UI [here](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=changelog).

This annotation can be provided using two different formats: using a plain list of strings with the description of the change or using a list of objects with some extra structured information (see example below). Please feel free to use the one that better suits your needs. The UI experience will be slightly different depending on the choice. When using the *list of objects* option the valid **supported kinds** are *added*, *changed*, *deprecated*, *removed*, *fixed* and *security*.

- **artifacthub.io/containsSecurityUpdates** *(boolean string, see example below)*

Use this annotation to indicate that this chart version contains security updates. When a package release contains security updates, a special message will be displayed in the Artifact Hub UI as well as in the new release email notification.

- **artifacthub.io/images** *(yaml string, see example below)*

Use this annotation to provide a list of the images used by this chart. Images listed will be scanned for security vulnerabilities. The security report generated will be available in the package detail view. It is possible to whitelist images so that they are not scanned by setting the `whitelisted` flag to true.

- **artifacthub.io/crds** *(yaml string, see example below)*

This annotation can be used to list the operator's CRDs. They will be visible in the package's detail view as cards.

- **artifacthub.io/crdsExamples** *(yaml string, see example below)*

Use this annotation to provide a list of example CRs for the operator's CRDs. Each of the examples can be opened from the corresponding CRD card in the package's detail view.

- **artifacthub.io/license** *(string)*

Use this annotation to indicate the chart's license. By default, Artifact Hub tries to read the chart's license from the `LICENSE` file in the chart, but it's possible to override or provide it with this annotation. It must be a valid [SPDX identifier](https://spdx.org/licenses/).

- **artifacthub.io/links** *(yaml string, see example below)*

This annotation allows including named links, which will be rendered nicely in Artifact Hub. You can use this annotation to include links not included previously in the Chart.yaml file, or you can use it to name links already present (in the sources section, for example).

- **artifacthub.io/maintainers** *(yaml string, see example below)*

This annotation can be used if you want to display a different name for a given user in Artifact Hub than the one used in the Chart.yaml file. If the email used matches, the name used in the annotations entry will be displayed in Artifact Hub. It's also possible to include maintainers that should only be listed in Artifact Hub by adding additional entries.

- **artifacthub.io/operator** *(boolean string, see example below)*

Use this annotation to indicate that your chart represents an operator. Artifact Hub at the moment also considers your chart to represent an operator if the word *operator* appears in the chart name.

- **artifacthub.io/operatorCapabilities** *(string)*

Use this annotation to indicate the capabilities of the operator your chart provides. It must be one of the following options: Basic Install, Seamless Upgrades, Full Lifecycle, Deep Insights or Auto Pilot. For more information please see the [capability level diagram](https://artifacthub.io/static/media/capability-level-diagram.svg).

- **artifacthub.io/prerelease** *(boolean string, see example below)*

Use this annotation to indicate that this chart version is a pre-release. This status will be displayed in the UI's package view, as well as in new releases notifications emails.

- **artifacthub.io/recommendations** *(yaml string, see example below)*

This annotation allows recommending other related packages. Recommended packages will be featured in the package detail view in Artifact Hub.

## Example

Artifact Hub annotations in `Chart.yaml`:

```yaml
annotations:
  artifacthub.io/changes: |
    - Added cool feature
    - Fixed minor bug
  artifacthub.io/changes: |
    - kind: added
      description: Cool feature
      links:
        - name: Github Issue
          url: https://github.com/issue-url
        - name: Github PR
          url: https://github.com/pr-url
    - kind: fixed
      description: Minor bug
      links:
        - name: Github Issue
          url: https://github.com/issue-url
  artifacthub.io/containsSecurityUpdates: "true"
  artifacthub.io/images: |
    - name: img1
      image: repo/img1:1.0.0
    - name: img2
      image: repo/img2:2.0.0
      whitelisted: true
  artifacthub.io/crds: |
    - kind: MyKind
      version: v1
      name: mykind
      displayName: My Kind
      description: Some nice description
  artifacthub.io/crdsExamples: |
    - apiVersion: v1
      kind: MyKind
      metadata:
        name: mykind
      spec:
        replicas: 1
  artifacthub.io/license: Apache-2.0
  artifacthub.io/links: |
    - name: link1
      url: https://link1.url
    - name: link2
      url: https://link2.url
  artifacthub.io/maintainers: |
    - name: user1
      email: user1@email.com
    - name: user2
      email: user2@email.com
  artifacthub.io/operator: "true"
  artifacthub.io/operatorCapabilities: Basic Install
  artifacthub.io/prerelease: "false"
  artifacthub.io/recommendations: |
    - url: https://artifacthub.io/packages/helm/artifact-hub/artifact-hub
    - url: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack
```
