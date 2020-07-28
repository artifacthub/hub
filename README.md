# Artifact Hub

[![CI](https://github.com/artifacthub/hub/workflows/CI/badge.svg)](https://github.com/artifacthub/hub/actions?query=workflow%3ACI)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/4106/badge)](https://bestpractices.coreinfrastructure.org/projects/4106)

Artifact Hub is a web-based application that enables finding, installing, and publishing packages and configurations for CNCF projects. For example, this could include Helm charts, Falco configurations, Open Policy Agent (OPA) policies, and OLM operators.

Discovering artifacts to use with CNCF projects can be difficult. If every CNCF project that needs to share artifacts creates its own Hub this creates a fair amount of repeat work for each project and a fractured experience for those trying to find the artifacts to consume. The Artifact Hub attempts to solve that by providing a single experience for consumers that any CNCF project can leverage.

The project, accessible at https://artifacthub.io, is currently in development in a alpha state. Support for Helm charts, Falco configurations, OPA policies and OLM operators is in development with plans to support more projects to follow. Pull requests, especially those to support other CNCF projects, are welcome.

Feel free to ask any questions on the #artifact-hub channel in the CNCF Slack. To get an invite please visit http://slack.cncf.io/.

## Community

The Artifact Hub is an open source project. Aside from contributing code and feature suggestions you can also engage via:

- Attending a meeting. Meetings are on the 2nd and 4th Wednesday of the month at 10:30am PT / 1:30pm ET. [Meeting minutes and agenda are in Google Docs](https://docs.google.com/document/d/1nkIgFh4dNPawoDD_9fV7vicVSeKk2Zcdd0C5yovSiKQ/edit).
- Joining [CNCF slack](https://cloud-native.slack.com) ([join link](https://slack.cncf.io/)) and joining the room #artifact-hub.

## Process

We are in conversation with the CNCF [TOC](https://github.com/cncf/toc) on whether it makes sense for Artifact Hub to become a sandbox project or whether a working group or similar mechanism might be better.

We're envisioning that Artifact Hub will have three main components:

1. The software, consisting of frontend code using React, backend written in Go, and Postgres with a number of stored procedures
2. A process by which new artifacts get added to Artifact Hub, updated, and removed. The documentation for this process is just beginning, but it needs to be publicly documented, transparent, and robust. In particular, edge cases need to be able to be reviewed by the project maintainers, with an appeal path to SIG Apps and the TOC
3. Operational responsibilities. A number of organizations are likely to depend on Artifact Hub not to “break the build” and so the maintainers will need to provide a high level of uptime, with CNCF funding the hosting and related systems

## Screenshots

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

The easiest way to try Artifact Hub in your Kubernetes cluster is by deploying the Helm chart provided. Let's see how this can be done using Minikube locally.

### Prerequisites

Before proceeding, please make sure your system meets the following requirements:

- Working [Minikube](https://minikube.sigs.k8s.io/docs/start/) environment
  - Nginx Ingress controller enabled (`minikube addons enable ingress`)
- [Helm](https://helm.sh/docs/intro/install/) installed

### Installing the chart

To install the chart with the release name `hub` run:

```bash
$ helm repo add artifact-hub https://artifacthub.github.io/hub
$ helm install --name hub artifact-hub/artifact-hub
```

The command deploys Artifact Hub on the Kubernetes cluster using the default configuration. The [configuration](#configuration) section lists the parameters that can be configured during installation.

As soon as all pods are up and running, you can access the Artifact Hub by visiting the address specified in your Ingress object in your browser (`http://192.168.64.18` in the case shown below).

```bash
$ kubectl get ingress
NAME   HOSTS   ADDRESS         PORTS   AGE
hub    *       192.168.64.18   80      6s
```

When the parameter `dbMigrator.loadSampleData` is set to true (default) a **demo** user and a couple of sample repositories are registered automatically. The credentials for the demo user are: `demo@artifacthub.io` / `changeme`. You can change the password from the control panel once you log in.

### Populating packages

The chart installs some `cronjobs` in charge of launching periodically (every 30m) the trackers, which index packages from the registered repositories. Some sample repositories are added by default when `dbMigrator.loadSampleData` is set to true. If you don't want to wait until the jobs are triggered by the cronjob, you can create some or all of them manually using the following commands:

```bash
$ kubectl create job initial-falco-tracker-job --from=cronjob/falco-tracker
$ kubectl create job initial-helm-tracker-job --from=cronjob/helm-tracker
$ kubectl create job initial-olm-tracker-job --from=cronjob/olm-tracker
$ kubectl create job initial-opa-tracker-job --from=cronjob/opa-tracker
```

### Uninstalling the Chart

To uninstall the `hub` deployment run:

```bash
$ helm uninstall hub
```

The command removes all the Kubernetes components associated with the chart and deletes the release.
