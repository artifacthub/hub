# Artifact Hub

[Artifact Hub](https://artifacthub.io) is a web-based application that enables finding, installing, and publishing Kubernetes packages.

## Introduction

This chart bootstraps an Artifact Hub deployment on a [Kubernetes](http://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

## Installing the Chart

To install the chart with the release name `hub` run:

```bash
$ helm repo add artifact-hub https://artifacthub.github.io/hub/chart
$ helm install hub artifact-hub/artifact-hub
```

The command deploys Artifact Hub on the Kubernetes cluster using the default configuration. The [configuration](#configuration) section lists the parameters that can be configured during installation.

As soon as all pods are up and running, you can access the Artifact Hub by visiting the address specified in your Ingress object in your browser (`http://192.168.64.18` in the case shown below).

```bash
$ kubectl get ingress
NAME   HOSTS   ADDRESS         PORTS   AGE
hub    *       192.168.64.18   80      6s
```

When the parameter `dbMigrator.loadSampleData` is set to true (default) a **demo** user and a couple of sample repositories are registered automatically. The credentials for the demo user are: `demo@artifacthub.io` / `changeme`. You can change the password from the control panel once you log in.

## Populating packages

The chart installs one `cronjob` in charge of launching periodically (every 30m) the tracker, which indexes packages from the registered repositories. Some sample repositories are added by default when `dbMigrator.loadSampleData` is set to true. If you don't want to wait until the job is triggered by the cronjob, you can create one manually using the following command:

```bash
$ kubectl create job initial-tracker-job --from=cronjob/tracker
```

## Packages security reports

The chart installs another `cronjob` in charge of launching periodically (every hour) the scanner, which scans packages' images for security vulnerabilities, generating security reports for them. If you don't want to wait until the job is triggered by the cronjob, you can create one manually using the following command:

```bash
$ kubectl create job initial-scanner-job --from=cronjob/scanner
```

## Uninstalling the Chart

To uninstall the `hub` deployment run:

```bash
$ helm uninstall hub
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the configurable parameters of the Artifact Hub chart and their default values.

| Parameter                              | Description                         | Default                                    |
| -------------------------------------- | ----------------------------------- | ------------------------------------------ |
| `imageTag`                             | Tag used when pulling images        | `latest`                                   |
| `pullPolicy`                           | Image pull policy                   | `IfNotPresent`                             |
| `log.level`                            | Log level                           | `info`                                     |
| `log.pretty`                           | Enable pretty logging               | `false`                                    |
| `db.host`                              | Database host                       | `hub-postgresql.default.svc.cluster.local` |
| `db.port`                              | Database port                       | `5432`                                     |
| `db.database`                          | Database name                       | `hub`                                      |
| `db.user`                              | Database user                       | `postgres`                                 |
| `db.password`                          | Database password                   | `postgres`                                 |
| `dbMigrator.job.image.repository`      | DB migrator image repository        | `artifacthub/db-migrator`                  |
| `dbMigrator.loadSampleData`            | Load demo user and sample repos     | `true`                                     |
| `hub.ingress.enabled`                  | Enable Hub ingress                  | `true`                                     |
| `hub.ingress.annotations`              | Hub ingress annotations             | `{kubernetes.io/ingress.class: nginx}`     |
| `hub.ingress.rules`                    | Hub ingress rules                   |                                            |
| `hub.service.type`                     | Hub service type                    | `NodePort`                                 |
| `hub.service.port`                     | Hub service port                    | 80                                         |
| `hub.deploy.readinessGates`            | Hub readiness gates                 |                                            |
| `hub.deploy.replicaCount`              | Hub replicas                        | 1                                          |
| `hub.deploy.image.repository`          | Hub image repository                | `artifacthub/hub`                          |
| `hub.deploy.resources`                 | Hub requested resources             | Memory: `500Mi`, CPU: `100m`               |
| `hub.server.baseURL`                   | Hub server base url                 |                                            |
| `hub.server.shutdownTimeout`           | Hub server shutdown timeout         | 10s                                        |
| `hub.server.basicAuth.enabled`         | Enable basic auth                   | `false`                                    |
| `hub.server.basicAuth.username`        | Hub basic auth username             | `hub`                                      |
| `hub.server.basicAuth.password`        | Hub basic auth password             | `changeme`                                 |
| `hub.server.cookie.hashKey`            | Hub cookie hash key                 | `default-unsafe-key`                       |
| `hub.server.cookie.secure`             | Enable Hub secure cookies           | `false`                                    |
| `hub.server.oauth.github.clientID`     | Github oauth client id              |                                            |
| `hub.server.oauth.github.clientSecret` | Github oauth client secret          |                                            |
| `hub.server.oauth.github.redirectURL`  | Github oauth redirect url           |                                            |
| `hub.server.oauth.github.scopes`       | Github oauth scopes                 | `[read:user, user:email]`                  |
| `hub.server.oauth.google.clientID`     | Google oauth client id              |                                            |
| `hub.server.oauth.google.clientSecret` | Google oauth client secret          |                                            |
| `hub.server.oauth.google.redirectURL`  | Google oauth redirect url           |                                            |
| `hub.server.oauth.google.scopes`       | Google oauth scopes                 | `[userinfo.email, userinfo.profile]`       |
| `hub.server.xffIndex`                  | X-Forwarded-For IP index            | 0                                          |
| `hub.email.fromName`                   | From name used in emails            |                                            |
| `hub.email.from`                       | From address used in emails         |                                            |
| `hub.email.replyTo`                    | Reply-to address used in emails     |                                            |
| `hub.email.smtp.host`                  | SMTP host                           |                                            |
| `hub.email.smtp.port`                  | SMTP port                           | 587                                        |
| `hub.email.smtp.username`              | SMTP username                       |                                            |
| `hub.email.smtp.password`              | SMTP password                       |                                            |
| `hub.analytics.gaTrackingID`           | Google Analytics tracking id        |                                            |
| `scanner.cronjob.image.repository`     | Scanner image repository            | `artifacthub/scanner`                      |
| `scanner.cronjob.resources`            | Scanner requested resources         | Memory: `500Mi`, CPU: `100m`               |
| `scanner.concurrency`                  | Snapshots to process concurrently   | 10                                         |
| `scanner.trivyURL`                     | Trivy server url                    | `http://trivy:8081`                        |
| `tracker.cronjob.image.repository`     | Tracker image repository            | `artifacthub/tracker`                      |
| `tracker.cronjob.resources`            | Tracker requested resources         | Memory: `500Mi`, CPU: `100m`               |
| `tracker.concurrency`                  | Repos to process concurrently       | 10                                         |
| `tracker.repositoriesNames`            | Repos names to process ([] = all)   | []                                         |
| `tracker.repositoriesKinds`            | Repos kinds to process ([] = all)   | []                                         |
| `tracker.imageStore`                   | Image store                         | `pg`                                       |
| `tracker.bypassDigestCheck`            | Bypass digest check                 | `false`                                    |
| `tracker.events.trackingErrors`        | Enable repo tracking errors events  | `false`                                    |
| `trivy.persistence.enabled`            | Use persistent volume to store data | false                                      |
| `trivy.persistence.size`               | Size of persistent volume claim     | 10Gi                                       |
| `trivy.persistence.storageClassName`   | Type of persistent volume claim     |                                            |
| `trivy.deploy.image`                   | Trivy image                         | `aquasec/trivy:0.11.0`                     |
| `trivy.deploy.resources`               | Trivy requested resources           | Memory: `500Mi`, CPU: `100m`               |
| `trivy.authURL`                        | Trivy authentication URL            |                                            |
| `trivy.username`                       | Trivy authentication username       |                                            |
| `trivy.password`                       | Trivy authentication password       |                                            |


Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```bash
$ helm install hub \
  --set dbMigrator.loadSampleData=false \
  artifact-hub/artifact-hub
```

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```bash
$ helm install hub -f values.yaml artifact-hub/artifact-hub
```
