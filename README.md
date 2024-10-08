# Artifact Hub

[![Go Report Card](https://goreportcard.com/badge/github.com/artifacthub/hub)](https://goreportcard.com/report/github.com/artifacthub/hub)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/4106/badge)](https://bestpractices.coreinfrastructure.org/projects/4106)
[![Artifact HUB](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/artifact-hub)](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub)
[![CLOMonitor](https://img.shields.io/endpoint?url=https://clomonitor.io/api/projects/cncf/artifact-hub/badge)](https://clomonitor.io/projects/cncf/artifact-hub)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/artifacthub/hub/badge)](https://securityscorecards.dev/viewer/?uri=github.com/artifacthub/hub)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/artifacthub/hub)
[![Licenses](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fartifacthub%2Fhub.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fartifacthub%2Fhub?ref=badge_shield)

[Artifact Hub](https://artifacthub.io) is a web-based application that enables finding, installing, and publishing packages and configurations for Cloud Native packages.

Discovering artifacts to use with CNCF projects can be difficult. If every CNCF project that needs to share artifacts creates its own Hub this creates a fair amount of repeat work for each project and a fractured experience for those trying to find the artifacts to consume. The Artifact Hub attempts to solve that by providing a single experience for consumers that any CNCF project can leverage.

At the moment, the following artifacts kinds are supported *(with plans to support more projects to follow)*:

- [Argo templates](https://argoproj.github.io/argo-workflows/)
- [Backstage plugins](https://backstage.io)
- [Containers images](https://opencontainers.org)
- [CoreDNS plugins](https://coredns.io/)
- [Falco configurations](https://falco.org/)
- [Gatekeeper policies](https://open-policy-agent.github.io/gatekeeper/website/docs/)
- [Headlamp plugins](https://headlamp.dev)
- [Helm charts](https://helm.sh/)
- [Helm plugins](https://helm.sh/docs/topics/plugins/)
- [Inspektor Gadgets](https://www.inspektor-gadget.io)
- [KCL modules](https://kcl-lang.io)
- [KEDA scalers](https://keda.sh/)
- [Keptn integrations](https://keptn.sh)
- [Knative client plugins](https://knative.dev)
- [KubeArmor policies](https://kubearmor.io)
- [Kubectl plugins (Krew)](https://krew.sigs.k8s.io/)
- [Kubewarden policies](https://www.kubewarden.io)
- [Kyverno policies](https://kyverno.io)
- [Meshery designs](https://meshery.io)
- [OLM operators](https://github.com/operator-framework)
- [OpenCost plugins](https://www.opencost.io)
- [Open Policy Agent (OPA) policies](https://www.openpolicyagent.org/)
- [Radius Recipes](https://radapp.io)
- [Tekton tasks, pipelines and stepactions](https://tekton.dev/)
- [Tinkerbell actions](https://tinkerbell.org/)

You can use Artifact Hub to:

- [Discover](https://artifacthub.io/packages/search), [install](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=install) and [publish](https://artifacthub.io/docs/topics/repositories/) packages and configurations
- Explore content like Helm charts [schemas](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=values-schema) and [templates](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub/0.20.0?modal=template&template=db_migrator_install_job.yaml) in an interactive way
- Subscribe to packages' new releases and security alerts notifications, via email or webhooks
- Visualize packages' [security reports](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub/0.19.0?modal=security-report)
- Inspect packages' [changelog](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=changelog)

Feel free to ask any questions on the #artifact-hub channel in the CNCF Slack. To get an invite please visit [http://slack.cncf.io/](http://slack.cncf.io/).

Artifact Hub is a [CNCF Incubating Project](https://www.cncf.io/projects/).

<br/>
<table>
    <tr>
        <td width="33%"><img src="https://artifacthub.github.io/hub/screenshots/screenshot1.jpg"></td>
        <td width="33%"><img src="https://artifacthub.github.io/hub/screenshots/screenshot2.jpg"></td>
        <td width="33%"><img src="https://artifacthub.github.io/hub/screenshots/screenshot3.jpg"></td>
    </tr>
    <tr>
        <td width="33%"><img src="https://artifacthub.github.io/hub/screenshots/screenshot4.jpg"></td>
        <td width="33%"><img src="https://artifacthub.github.io/hub/screenshots/screenshot5.jpg"></td>
        <td width="33%"><img src="https://artifacthub.github.io/hub/screenshots/screenshot6.jpg"></td>
    </tr>
</table>

## Getting started

[Artifact Hub](https://artifacthub.io) allows publishers to list their content in an automated way. Please check out the [repositories guide](https://artifacthub.io/docs/topics/repositories/) for more details about how to add your repositories.

If you want to run your own Artifact Hub instance in your Kubernetes cluster, the easiest way is by deploying the Helm chart provided. For more details, please see the [Helm chart documentation in Artifact Hub](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub).

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## Community

The Artifact Hub is an open source project. Aside from contributing code and feature suggestions you can also engage via:

- Attending a meeting. Meetings are on the 2nd Tuesday of the month at 10:30am PT / 1:30pm ET. [Meeting minutes and agenda are in Google Docs](https://docs.google.com/document/d/1nkIgFh4dNPawoDD_9fV7vicVSeKk2Zcdd0C5yovSiKQ/edit).
- Joining [CNCF slack](https://cloud-native.slack.com) ([join link](https://slack.cncf.io/)) and joining the room #artifact-hub.

## Changelog

The *changelog* is [available on Artifact Hub](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=changelog).

## Code of Conduct

This project follows the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/master/code-of-conduct.md).

## Roadmap

Please see [ROADMAP.md](./ROADMAP.md) for more details.

## Security

To report a security problem in Artifact Hub, please contact the Maintainers Team at <cncf-artifacthub-maintainers@lists.cncf.io>. Please see [SECURITY.md](./SECURITY.md) for more details.

## CLOMonitor Report

[![CloMonitor report summary](https://clomonitor.io/api/projects/cncf/artifact-hub/report-summary?theme=light)](https://clomonitor.io/projects/cncf/artifact-hub)

## License

Artifact Hub is an Open Source project licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fartifacthub%2Fhub.svg?type=large)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fartifacthub%2Fhub?ref=badge_large)
