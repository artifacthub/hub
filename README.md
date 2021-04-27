# Artifact Hub

[![CI](https://github.com/artifacthub/hub/workflows/CI/badge.svg)](https://github.com/artifacthub/hub/actions?query=workflow%3ACI)
[![Go Report Card](https://goreportcard.com/badge/github.com/artifacthub/hub)](https://goreportcard.com/report/github.com/artifacthub/hub)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/4106/badge)](https://bestpractices.coreinfrastructure.org/projects/4106)
[![Artifact HUB](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/artifact-hub)](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/artifacthub/hub)

Artifact Hub is a web-based application that enables finding, installing, and publishing packages and configurations for CNCF projects. For example, this could include Helm charts and plugins, Falco configurations, Open Policy Agent (OPA) policies, OLM operators, Tinkerbell actions, kubectl plugins, Tekton tasks, KEDA scalers and CoreDNS plugins.

Discovering artifacts to use with CNCF projects can be difficult. If every CNCF project that needs to share artifacts creates its own Hub this creates a fair amount of repeat work for each project and a fractured experience for those trying to find the artifacts to consume. The Artifact Hub attempts to solve that by providing a single experience for consumers that any CNCF project can leverage.

The project, accessible at [https://artifacthub.io](https://artifacthub.io), is currently in development in a beta state. Support for Helm charts and plugins, Falco configurations, OPA policies, OLM operators, Tinkerbell actions, kubectl plugins, Tekton tasks, KEDA scalers and CoreDNS plugins is in development with plans to support more projects to follow. Pull requests, especially those to support other CNCF projects, are welcome. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) and [dev.md](./docs/dev.md) for more details.

Feel free to ask any questions on the #artifact-hub channel in the CNCF Slack. To get an invite please visit [http://slack.cncf.io/](http://slack.cncf.io/).

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

Artifact Hub allows publishers to list their content in an automated way. Please check out the [repositories guide](./docs/repositories.md) for more details about how to add your repositories.

If you want to run your own Artifact Hub instance in your Kubernetes cluster, the easiest way is by deploying the Helm chart provided. For more details, please see the [Helm chart README file](charts/artifact-hub/README.md).

## Community

The Artifact Hub is an open source project. Aside from contributing code and feature suggestions you can also engage via:

- Attending a meeting. Meetings are on the 2nd Tuesday of the month at 10:30am PT / 1:30pm ET. [Meeting minutes and agenda are in Google Docs](https://docs.google.com/document/d/1nkIgFh4dNPawoDD_9fV7vicVSeKk2Zcdd0C5yovSiKQ/edit).
- Joining [CNCF slack](https://cloud-native.slack.com) ([join link](https://slack.cncf.io/)) and joining the room #artifact-hub.

## Process

Artifact Hub is a [CNCF Sandbox Project](https://www.cncf.io/sandbox-projects/).

We're envisioning that Artifact Hub will have three main components:

1. The software, consisting of frontend code using React, backend written in Go, and Postgres with a number of stored procedures
2. A process by which new artifacts get added to Artifact Hub, updated, and removed. The documentation for this process is just beginning, but it needs to be publicly documented, transparent, and robust. In particular, edge cases need to be able to be reviewed by the project maintainers, with an appeal path to SIG Apps and the TOC
3. Operational responsibilities. A number of organizations are likely to depend on Artifact Hub not to “break the build” and so the maintainers will need to provide a high level of uptime, with CNCF funding the hosting and related systems

## Code of Conduct

This project follows the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/master/code-of-conduct.md).

## Security

To report a security problem in Artifact Hub, please contact the Maintainers Team at
<cncf-artifacthub-maintainers@lists.cncf.io>. Please see [SECURITY.md](./SECURITY.md) for more details.

## License

Artifact Hub is an Open Source project licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
