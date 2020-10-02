# Artifact Hub annotations in Helm Chart.yaml file

Artifact Hub uses the metadata in the chart's `Chart.yaml` file to populate the information for a package of kind Helm. Usually most of the information needed is already there, so there is no extra work required by charts maintainers to list them on Artifact Hub.

However, sometimes there might be cases in which it may be useful to provide some more context that helps improving users' experience in Artifact Hub. This can be done using some special **annotations** in the [Chart.yaml](https://helm.sh/docs/topics/charts/#the-chartyaml-file) file.

## Supported annotations

- **artifacthub.io/crds** *(yaml string, see example below)*

This annotation can be used to list the operator's CRDs. They will be visible in the package's detail view as cards.

- **artifacthub.io/crdsExamples** *(yaml string, see example below)*

Use this annotation to provide a list of example CRs for the operator's CRDs. Each of the examples can be opened from the corresponding CRD card in the package's detail view.

- **artifacthub.io/links** *(yaml string, see example below)*

This annotation allows including named links, which will be rendered nicely in Artifact Hub. You can use this annotation to include links not included previously in the Chart.yaml file, or you can use it to name links already present (in the sources section, for example).

- **artifacthub.io/maintainers** *(yaml string, see example below)*

This annotation can be used if you want to display a different name for a given user in Artifact Hub than the one used in the Chart.yaml file. If the email used matches, the name used in the annotations entry will be displayed in Artifact Hub. It's also possible to include maintainers that should only be listed in Artifact Hub by adding additional entries.

- **artifacthub.io/operator** *(boolean string, see example below)*

Use this annotation to indicate that your chart represents an operator. Artifact Hub at the moment also considers your chart to represent an operator if the word *operator* appears in the chart name.

- **artifacthub.io/operatorCapabilities** *(string)*

Use this annotation to indicate the capabilities of the operator your chart provides. It must be one of the following options: Basic Install, Seamless Upgrades, Full Lifecycle, Deep Insights or Auto Pilot. For more information please see the [capability level diagram](https://artifacthub.io/static/media/capability-level-diagram.svg).

## Example

Artifact Hub annotations in `Chart.yaml`:

```yaml
annotations:
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
```
