# Artifact Hub

[Artifact Hub](https://artifacthub.io) is a web-based application that enables finding, installing, and publishing Kubernetes packages.

## Introduction

This chart bootstraps an Artifact Hub deployment on a [Kubernetes](http://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

## Installing the Chart

To install the chart with the release name `hub` run:

```bash
$ helm repo add artifact-hub https://artifacthub.github.io/hub
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

The chart installs a `cronjob` in charge of launching periodically (every 30m) a process called `chart-tracker` which indexes charts. If you don't want to wait until it's triggered by the cronjob, you can create a `job` manually using the following command:

```bash
$ kubectl create job initial-chart-tracker-job --from=cronjob/chart-tracker
```

## Uninstalling the Chart

To uninstall the `hub` deployment run:

```bash
$ helm uninstall hub
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the configurable parameters of the Artifact Hub chart and their default values.

| Parameter                               | Description                       | Default                                    |
| --------------------------------------- | --------------------------------- | ------------------------------------------ |
| `imageTag`                              | Tag used when pulling images      | `latest`                                   |
| `pullPolicy`                            | Image pull policy                 | `IfNotPresent`                             |
| `log.level`                             | Log level                         | `info`                                     |
| `log.pretty`                            | Enable pretty logging             | `false`                                    |
| `db.host`                               | Database host                     | `hub-postgresql.default.svc.cluster.local` |
| `db.port`                               | Database port                     | `5432`                                     |
| `db.database`                           | Database name                     | `hub`                                      |
| `db.user`                               | Database user                     | `postgres`                                 |
| `db.password`                           | Database password                 | `postgres`                                 |
| `hub.ingress.enabled`                   | Enable Hub ingress                | `true`                                     |
| `hub.ingress.annotations`               | Hub ingress annotations           | `{kubernetes.io/ingress.class: nginx}`     |
| `hub.service.type`                      | Hub service type                  | `NodePort`                                 |
| `hub.service.port`                      | Hub service port                  | 80                                         |
| `hub.deploy.replicaCount`               | Hub replicas                      | 1                                          |
| `hub.deploy.image.repository`           | Hub image repository              | `artifacthub/hub`                          |
| `hub.deploy.resources`                  | Hub requested resources           | Memory: `500Mi`, CPU: `100m`               |
| `hub.server.baseURL`                    | Hub server base url               |                                            |
| `hub.server.basicAuth.enabled`          | Enable basic auth                 | `false`                                    |
| `hub.server.basicAuth.username`         | Hub basic auth username           | `hub`                                      |
| `hub.server.basicAuth.password`         | Hub basic auth password           | `changeme`                                 |
| `hub.server.cookie.hashKey`             | Hub cookie hash key               | `default-unsafe-key`                       |
| `hub.server.cookie.secure`              | Enable Hub secure cookies         | `false`                                    |
| `hub.server.oauth.github.clientID`      | Github oauth client id            |                                            |
| `hub.server.oauth.github.clientSecret`  | Github oauth client secret        |                                            |
| `hub.server.oauth.github.redirectURL`   | Github oauth redirect url         |                                            |
| `hub.server.oauth.github.scopes`        | Github oauth scopes               | `[read:user, user:email]`                  |
| `hub.server.oauth.google.clientID`      | Google oauth client id            |                                            |
| `hub.server.oauth.google.clientSecret`  | Google oauth client secret        |                                            |
| `hub.server.oauth.google.redirectURL`   | Google oauth redirect url         |                                            |
| `hub.server.oauth.google.scopes`        | Google oauth scopes               | `[userinfo.email, userinfo.profile]`       |
| `hub.email.fromName`                    | From name used in emails          |                                            |
| `hub.email.from`                        | From address used in emails       |                                            |
| `hub.email.replyTo`                     | Reply-to address used in emails   |                                            |
| `hub.email.smtp.host`                   | SMTP host                         |                                            |
| `hub.email.smtp.port`                   | SMTP port                         | 587                                        |
| `hub.email.smtp.username`               | SMTP username                     |                                            |
| `hub.email.smtp.password`               | SMTP password                     |                                            |
| `hub.analytics.gaTrackingID`            | Google Analytics tracking id      |                                            |
| `chartTracker.cronjob.image.repository` | Chart tracker image repository    | `artifacthub/chart-tracker`                |
| `chartTracker.cronjob.resources`        | Chart tracker requested resources | Memory: `500Mi`, CPU: `100m`               |
| `chartTracker.numWorkers`               | Chart tracker number of workers   | 50                                         |
| `chartTracker.repositories`             | Repos names to process ([] = all) | []                                         |
| `chartTracker.imageStore`               | Image store                       | `pg`                                       |
| `chartTracker.bypassDigestCheck`        | Bypass digest check               | `false`                                    |
| `dbMigrator.job.image.repository`       | DB migrator image repository      | `artifacthub/db-migrator`                  |
| `dbMigrator.loadSampleData`             | Load demo user and sample repos   | `true`                                     |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```bash
$ helm install --name hub \
  --set dbMigrator.loadSampleData=false \
  artifact-hub/artifact-hub
```

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```bash
$ helm install --name hub -f values.yaml artifact-hub/artifact-hub
```
