# Artifact Hub annotations in Helm Chart.yaml file

Artifact Hub uses the metadata in the chart's `Chart.yaml` file to populate the information for a package of kind Helm. Usually most of the information needed is already there, so there is no extra work required by charts maintainers to list them on Artifact Hub.

However, sometimes there might be cases in which it may be useful to provide some more context that helps improving users' experience in Artifact Hub. This can be done using some special **annotations** in the [Chart.yaml](https://helm.sh/docs/topics/charts/#the-chartyaml-file) file.

## Supported annotations

- **artifacthub.io/alternativeName** *(string)*

Sometimes a package can be identified by two similar names. Some examples would be *postgres* / *postgresql* or *mongodb* / *mongo*. Users often may type any of the options and expect the same results. When searching for packages, Artifact Hub gives preference to **exact** matches in names, so sometimes the top results may not be what users would expect. This situation can be improved by providing an alternative name for your package, which will be given the same weight as the package name when indexing. So in cases like the previous examples, it can help ranking them higher in the search results.

*Please note that the alternative name must be a substring of the name, or the name must be a substring of the alternative name.*

- **artifacthub.io/category** *(string, see example below)*

This annotation allows publishers to provide the package's category. Please use only *one* category from the following list: `ai-machine-learning`, `database`, `integration-delivery`, `monitoring-logging`, `networking`, `security`, `storage` or `streaming-messaging`.

When a category is not provided, Artifact Hub will **try to predict** one from the package's *keywords* by using a machine learning-based model. If you notice that the prediction isn't correct, we really appreciate that you submit the correct category as it helps us to train and improve the model. In the case that the prediction isn't correct but your package doesn't fit well in any of the categories supported, you can use the special value `skip-prediction` in the category field to prevent an incorrect classification.

- **artifacthub.io/changes** *(yaml string, see example below)*

This annotation is used to provide some details about the changes introduced by a given chart version. Artifact Hub can generate and display a **ChangeLog** based on the entries in the `changes` field in all your chart versions. You can see an example of how the changelog would look like in the Artifact Hub UI [here](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=changelog).

This annotation can be provided using two different formats: using a plain list of strings with the description of the change or using a list of objects with some extra structured information (see example below). Please feel free to use the one that better suits your needs. The UI experience will be slightly different depending on the choice. When using the *list of objects* option the valid **supported kinds** are *added*, *changed*, *deprecated*, *removed*, *fixed* and *security*.

- **artifacthub.io/containsSecurityUpdates** *(boolean string, see example below)*

Use this annotation to indicate that this chart version contains security updates. When a package release contains security updates, a special message will be displayed in the Artifact Hub UI as well as in the new release email notification.

- **artifacthub.io/images** *(yaml string, see example below)*

By default, Artifact Hub will try to extract the containers images used by Helm charts from the manifests generated from a dry-run install using the default values. If you prefer, you can also provide a list of containers images manually by using this annotation. Providing the information manually also allows adding some extra information, like the platforms supported by each of the images.

Containers images will be scanned for security vulnerabilities. The security report generated will be available in the package detail view. It is possible to whitelist images so that they are not scanned by setting the `whitelisted` flag to true.

- **artifacthub.io/crds** *(yaml string, see example below)*

This annotation can be used to list the operator's CRDs. They will be visible in the package's detail view as cards.

- **artifacthub.io/crdsExamples** *(yaml string, see example below)*

Use this annotation to provide a list of example CRs for the operator's CRDs. Each of the examples can be opened from the corresponding CRD card in the package's detail view.

- **artifacthub.io/license** *(string)*

Use this annotation to indicate the chart's license. By default, Artifact Hub tries to read the chart's license from the `LICENSE` file in the chart, but it's possible to override or provide it with this annotation. It must be a valid [SPDX identifier](https://spdx.org/licenses/).

- **artifacthub.io/links** *(yaml string, see example below)*

This annotation allows including named links, which will be rendered nicely in Artifact Hub. You can use this annotation to include links not included previously in the Chart.yaml file, or you can use it to name links already present (in the sources section, for example).

Some links names have a special meaning for Artifact Hub:

**support**: when a link named *support* is provided, a link to report an issue will be displayed highlighted on the package view.

- **artifacthub.io/maintainers** *(yaml string, see example below)*

This annotation can be used if you want to display a different name for a given user in Artifact Hub than the one used in the Chart.yaml file. If the email used matches, the name used in the annotations entry will be displayed in Artifact Hub. It's also possible to include maintainers that should only be listed in Artifact Hub by adding additional entries.

- **artifacthub.io/operator** *(boolean string, see example below)*

Use this annotation to indicate that your chart represents an operator. Artifact Hub at the moment also considers your chart to represent an operator if the word *operator* appears in the chart name.

- **artifacthub.io/operatorCapabilities** *(string)*

Use this annotation to indicate the capabilities of the operator your chart provides. It must be one of the following options: *basic install*, *seamless upgrades*, *full lifecycle*, *deep insights* or *auto pilot*. For more information please see the [capability level diagram](https://artifacthub.io/static/media/capability-level-diagram_v3.svg).

- **artifacthub.io/prerelease** *(boolean string, see example below)*

Use this annotation to indicate that this chart version is a pre-release. This status will be displayed in the UI's package view, as well as in new releases notifications emails.

- **artifacthub.io/recommendations** *(yaml string, see example below)*

This annotation allows recommending other related packages. Recommended packages will be featured in the package detail view in Artifact Hub.

- **artifacthub.io/screenshots** *(yaml string, see example below)*

This annotation can be used to provide some screenshots that will be featured in the package detail view in Artifact Hub.

- **artifacthub.io/signKey** *(yaml string, see example below)*

This annotation can be used to provide some information about the key used to sign a given chart version. This information will be displayed on the Artifact Hub UI, making it easier for users to get the information they need to verify the integrity and origin of your chart. The `url` field indicates where users can find the public key and it is mandatory when a sign key entry is provided.

## Example

Artifact Hub annotations in `Chart.yaml`:

```yaml
annotations:
  artifacthub.io/category: security
  artifacthub.io/changes: |
    - Added cool feature
    - Fixed minor bug
  artifacthub.io/changes: |
    - kind: added
      description: Cool feature
      links:
        - name: GitHub Issue
          url: https://github.com/issue-url
        - name: GitHub PR
          url: https://github.com/pr-url
    - kind: fixed
      description: Minor bug
      links:
        - name: GitHub Issue
          url: https://github.com/issue-url
  artifacthub.io/containsSecurityUpdates: "true"
  artifacthub.io/images: |
    - name: img1
      image: repo/img1:1.0.0
      platforms:
        - linux/amd64
    - name: img2
      image: repo/img2:2.0.0
      whitelisted: true
      platforms:
        - linux/amd64
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
  artifacthub.io/screenshots: |
    - title: Sample screenshot 1
      url: https://example.com/screenshot1.jpg
    - title: Sample screenshot 2
      url: https://example.com/screenshot2.jpg
  artifacthub.io/signKey: |
    fingerprint: C874011F0AB405110D02105534365D9472D7468F
    url: https://keybase.io/hashicorp/pgp_keys.asc
```
