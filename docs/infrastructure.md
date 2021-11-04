# Infrastructure

This document describes the infrastructure used to deploy the production and staging environments of `artifacthub.io`.

## Overview

`artifacthub.io` runs on AWS, using an account owned by the [CNCF](https://www.cncf.io) and managed by the Artifact Hub [maintainers](https://github.com/artifacthub/hub/blob/master/OWNERS). The following services are being used at the moment:

- **Route 53:** the `artifacthub.io` domain and associated DNS entries are managed from Route 53. The most important entry is the `A` record for `artifacthub.io`, which points to the domain name of a CloudFront distribution.

- **Certificate Manager:** the SSL/TLS certificates used by other services like CloudFront and Load Balancing are provisioned and managed by the Certificate Manager. Certificates are configured to be renewed automatically.

- **CloudFront:** all static assets and API endpoints traffic is delivered from CloudFront, which caches accordingly to the origin cache headers. The main origin for each distribution is a load balancer that points to a pool of `hub` instances. Another S3 based origin hosts the static assets for the maintenance page. There is a set of behaviors to define more explicitly how some special paths and errors should be handled.

- **Load Balancing:** an application load balancer distributes traffic among the `hub` instances available. This load balancer acts as the main origin for the corresponding CloudFront distribution. It is created and managed automatically by the [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/) based on the `hub ingress` resource.

- **Firewall Manager:** both CloudFront and the load balancer have associated a set of web ACLs rules to rate limit and block certain traffic patterns.

- **Container Registry:** a Docker image for each of the Artifact Hub components is built and pushed to ECR for each commit to the `master` branch via the [CI workflow](https://github.com/artifacthub/hub/blob/master/.github/workflows/ci.yml). These images are the ones used by the `artifacthub.io` production and staging deployments. These images are *NOT* publicly available. In addition to them, we also [build images for each release version](https://github.com/artifacthub/hub/blob/master/.github/workflows/release.yml), which are published to the Docker Hub and made publicly available.

- **Elastic Kubernetes Service:** the Artifact Hub components are deployed on a Kubernetes cluster managed by EKS. Each environment (production and staging) runs on a separate cluster. The installation and upgrades are done using the official [Helm chart](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub) provided by the project.

- **Relational Database Service (RDS):** the PostgreSQL instance used as the main datastore for Artifact Hub is managed by RDS. Each environment has its own database instance running in a Multi-AZ setup.

- **Simple Email Service:** Artifact Hub needs a SMTP server configured to be able to send emails. In the `artifacthub.io` deployments this is set up using SES.

## Installation

This section describes how to bootstrap the `artifacthub.io` deployment.

## Setup Kubernetes cluster

We'll create a Kubernetes cluster in EKS using [eksctl](https://eksctl.io). The following command will spin up the cluster as well as all associated required resources, like the VPC, etc.

```sh
eksctl create cluster \
  --name=<CLUSTER_NAME> \
  --version=<KUBERNETES_VERSION> \
  --region=<AWS_REGION> \
  --managed \
  --node-type=m5.xlarge \
  --nodes=6 \
  --nodes-min=6 \
  --nodes-max=10 \
  --alb-ingress-access
```

### Install AWS Load Balancer Controller

The Load Balancer Controller will take care of creating the application load balancer from the corresponding K8S ingress resource. Please follow to the [official installation instructions](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/) to install it on the cluster.

### Create namespace and label it for pod readiness gate

We need to apply the [readiness gate](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/pod_readiness_gate/) inject label to the namespace we'll use to install Artifact Hub. This will allow us to indicate that the pod is registered to the application load balancer and healthy to receive traffic.

```sh
kubectl create namespace <NAMESPACE_NAME>
kubectl label namespace <NAMESPACE_NAME> elbv2.k8s.aws/pod-readiness-gate-inject=enabled
```

## Setup PostgreSQL instance

Before creating a PostgreSQL instance in RDS, we'll setup a security and subnet groups for it. The security group will contain an inbound rule allowing traffic to the PostgreSQL service port from the EKS cluster nodes. The subnet group will list *only* the **private** subnets attached to the VPC that `eksctl` created for our Kubernetes cluster. Once both are ready we can proceed with the RDS database creation.

## Install Artifact Hub chart

The `artifacthub.io` deployment is installed using the official [Helm chart](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub) provided by the project. In addition to the [default Chart values](https://github.com/artifacthub/hub/blob/master/charts/artifact-hub/values.yaml), we provide a file with some specific values for the [staging](https://github.com/artifacthub/hub/blob/master/charts/artifact-hub/values-staging.yaml) and [production](https://github.com/artifacthub/hub/blob/master/charts/artifact-hub/values-production.yaml) environments. These are not recommended official values for production deployments, just the ones used by `artifacthub.io`. On top of those, some extra values containing credentials and other pieces of information are provided using `--set` when running the installation command.

```sh
helm install \
  --values values-<ENVIRONMENT>.yaml \
  --namespace <NAMESPACE_NAME> \
  --set imageTag=<GIT_SHA> \
  --set creds.dockerUsername=<DOCKER_USERNAME> \
  --set creds.dockerPassword=<DOCKER_PASSWORD> \
  --set db.user=<DB_USER> \
  --set db.host=<DB_HOST> \
  --set db.password=<DB_PASSWORD> \
  --set email.fromName="Artifact Hub" \
  --set email.from=hub@artifacthub.io \
  --set email.replyTo=no-reply@artifacthub.io \
  --set email.smtp.host=<SMTP_HOST> \
  --set email.smtp.port=<SMTP_PORT> \
  --set email.smtp.username=<SMTP_USERNAME> \
  --set email.smtp.password=<SMTP_PASSWORD> \
  --set dbMigrator.job.image.repository=<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/db-migrator \
  --set hub.deploy.image.repository=<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/hub \
  --set hub.ingress.annotations."alb\.ingress\.kubernetes\.io/certificate-arn"=<CERTIFICATE_ARN> \
  --set hub.ingress.annotations."alb\.ingress\.kubernetes\.io/wafv2-acl-arn"=<ACL_ARN> \
  --set hub.server.cookie.hashKey=<COOKIE_HASHKEY> \
  --set hub.server.cookie.secure=true \
  --set hub.server.csrf.authKey=<CSRF_AUTHKEY> \
  --set hub.server.csrf.secure=true \
  --set hub.server.xffIndex=-2 \
  --set hub.server.oauth.github.clientID=<GITHUB_CLIENT_ID> \
  --set hub.server.oauth.github.clientSecret=<GITHUB_CLIENT_SECRET> \
  --set hub.server.oauth.google.clientID=<GOOGLE_CLIENT_ID> \
  --set hub.server.oauth.google.clientSecret=<GOOGLE_CLIENT_SECRET> \
  --set hub.analytics.gaTrackingID=<GA_TRACKING_ID> \
  --set tracker.cronjob.image.repository=<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/tracker \
  --set scanner.cronjob.image.repository=<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/scanner \
<RELEASE_NAME> .
```

For more information about any of the values provided, please check the [values schema](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=values-schema).

## Update CloudFront distribution origin

Once all the pods are up and running and the application load balancer corresponding to the `hub ingress` has been provisioned, we can update the origin in the CloudFront distribution and point it to the new load balancer.
