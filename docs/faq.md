# FAQ <!-- omit from toc -->

- [General Questions](#general-questions)
  - [What is Artifact Hub and what does it do?](#what-is-artifact-hub-and-what-does-it-do)
  - [What artifact kinds does Artifact Hub support?](#what-artifact-kinds-does-artifact-hub-support)
  - [How do I request support for a new artifact kind?](#how-do-i-request-support-for-a-new-artifact-kind)
  - [How often does Artifact Hub check repositories for updates?](#how-often-does-artifact-hub-check-repositories-for-updates)
  - [Can I install applications directly from Artifact Hub?](#can-i-install-applications-directly-from-artifact-hub)
- [Repository Management](#repository-management)
  - [How do I add my repository to Artifact Hub?](#how-do-i-add-my-repository-to-artifact-hub)
  - [How do I become a verified publisher?](#how-do-i-become-a-verified-publisher)
  - [How can I claim ownership of a repository that someone else added?](#how-can-i-claim-ownership-of-a-repository-that-someone-else-added)
  - [What are the benefits of claiming repository ownership?](#what-are-the-benefits-of-claiming-repository-ownership)
  - [Where should I place the artifacthub-repo.yml file?](#where-should-i-place-the-artifacthub-repoyml-file)
  - [I've added the metadata file but I still can't see the verified publisher status](#ive-added-the-metadata-file-but-i-still-cant-see-the-verified-publisher-status)
  - [Can I change my repository name after creating it?](#can-i-change-my-repository-name-after-creating-it)
  - [Why am I getting "There is another repository using this url" error?](#why-am-i-getting-there-is-another-repository-using-this-url-error)
  - [How do I force my repository to be reprocessed?](#how-do-i-force-my-repository-to-be-reprocessed)
- [Helm Charts](#helm-charts)
  - [Can I use Artifact Hub as a single charts repository for all the charts listed on it?](#can-i-use-artifact-hub-as-a-single-charts-repository-for-all-the-charts-listed-on-it)
  - [What is the source of the README file displayed in Artifact Hub?](#what-is-the-source-of-the-readme-file-displayed-in-artifact-hub)
  - [How do I add changelog information to my chart?](#how-do-i-add-changelog-information-to-my-chart)
  - [Why aren't my chart updates appearing?](#why-arent-my-chart-updates-appearing)
  - [How do I add container images for security scanning?](#how-do-i-add-container-images-for-security-scanning)
  - [Why do old chart versions disappear from Artifact Hub?](#why-do-old-chart-versions-disappear-from-artifact-hub)
  - [How do I add OCI-based Helm charts?](#how-do-i-add-oci-based-helm-charts)
  - [Can I add my entire OCI registry to Artifact Hub?](#can-i-add-my-entire-oci-registry-to-artifact-hub)
  - [How do I add the repository metadata file for OCI repositories?](#how-do-i-add-the-repository-metadata-file-for-oci-repositories)
- [Authentication](#authentication)
  - [How do I reset my 2FA?](#how-do-i-reset-my-2fa)
  - [Can I change my email address?](#can-i-change-my-email-address)
- [Self-hosted Deployments](#self-hosted-deployments)
  - [How do I install Artifact Hub on my own infrastructure?](#how-do-i-install-artifact-hub-on-my-own-infrastructure)
  - [Can I use custom OAuth providers?](#can-i-use-custom-oauth-providers)
  - [How do I enable private repositories?](#how-do-i-enable-private-repositories)
  - [How do I add repositories to my self-hosted instance?](#how-do-i-add-repositories-to-my-self-hosted-instance)
  - [What's the demo user for self-hosted instances?](#whats-the-demo-user-for-self-hosted-instances)
  - [Can I restrict access to some of the content in my self-hosted instance?](#can-i-restrict-access-to-some-of-the-content-in-my-self-hosted-instance)
- [API and integrations](#api-and-integrations)
  - [What are the API rate limits?](#what-are-the-api-rate-limits)
  - [How can I get all charts listed on artifacthub.io without hitting rate limits?](#how-can-i-get-all-charts-listed-on-artifacthubio-without-hitting-rate-limits)
  - [Is there an endpoint to get security reports?](#is-there-an-endpoint-to-get-security-reports)
- [Official Status and Verification](#official-status-and-verification)
  - [How do I get the "Official" status for my packages?](#how-do-i-get-the-official-status-for-my-packages)
  - [What's the difference between "Verified Publisher" and "Official"?](#whats-the-difference-between-verified-publisher-and-official)
  - [Do I need to create an organization to get official status?](#do-i-need-to-create-an-organization-to-get-official-status)
- [Security Reports](#security-reports)
  - [How does security scanning work?](#how-does-security-scanning-work)
  - [Can I exclude specific images from security scanning?](#can-i-exclude-specific-images-from-security-scanning)
  - [Why don't I see security reports for my charts?](#why-dont-i-see-security-reports-for-my-charts)
  - [Can I scan private registry images?](#can-i-scan-private-registry-images)
- [Getting Help](#getting-help)
  - [How do I report issues with packages listed on Artifact Hub?](#how-do-i-report-issues-with-packages-listed-on-artifact-hub)
  - [Where can I find more documentation?](#where-can-i-find-more-documentation)
  - [How do I report issues or request features for Artifact Hub itself?](#how-do-i-report-issues-or-request-features-for-artifact-hub-itself)

## General Questions

### What is Artifact Hub and what does it do?

Artifact Hub is a web-based application that enables finding, installing and publishing packages and configurations for CNCF projects.

### What artifact kinds does Artifact Hub support?

Artifact Hub supports 25+ artifact kinds. Please see the [repositories guide](/docs/topics/repositories/) for a full list and more information about each of them.

### How do I request support for a new artifact kind?

The best way is opening an issue in the Artifact Hub GitHub repository. Please see other examples to see how the process works. Note that Artifact Hub currently only supports vendor neutral artifacts. Everything listed is currently in a foundation and not attached to a single vendor.

### How often does Artifact Hub check repositories for updates?

Repositories are processed every 30 minutes. Once your repository is processed again, changes should be visible in less than 5 minutes.

### Can I install applications directly from Artifact Hub?

No, it's not possible to install applications from Artifact Hub. In the package detail view, we provide installation instructions that will tell you how to add the repository and install the package using the appropriate tool for the artifact kind. Note that Artifact Hub does not store or proxy the content of the repositories. It only collects some metadata from them.

## Repository Management

### How do I add my repository to Artifact Hub?

You can add your repository to Artifact Hub from the control panel in the UI after signing in. Please see the [repositories guide](/docs/topics/repositories/) for more details about each supported repository kind.

### How do I become a verified publisher?

You need to add a metadata file to the repository including the repository ID listed in the control panel. For more information please see the [verified publisher section](/docs/topics/repositories/#verified-publisher) of the repositories guide.

### How can I claim ownership of a repository that someone else added?

You can claim the ownership of a repository automatically by following [this process](/docs/topics/repositories/#ownership-claim). It's an automated process that doesn't require contacting the current owners - you just need to add a metadata file with your email address.

### What are the benefits of claiming repository ownership?

It has some advantages:

- Users will see your organization as the publishing organization
- You can control the repository from the control panel, explore tracking errors or receive alerts for some events
- Your repository can obtain the `Verified Publisher` badge
- You can request the `Official` badge as well (this one is not automated, needs to be done via a Github issue)

### Where should I place the artifacthub-repo.yml file?

In the case of Helm charts repositories, the metadata file is expected to be served at the same level as your `index.yaml` file. For example: `https://your-domain.github.io/helm-charts/artifacthub-repo.yml`. In the case of other artifact kinds that rely on the `artifacthub-pkg.yml` metadata file, the repository metadata file is expected to be located at the root of the repository packages path.

### I've added the metadata file but I still can't see the verified publisher status

The verified publisher flag won’t be set until the next time the repository is processed. Please keep in mind that the repository won’t be processed if it hasn’t changed since the last time it was processed.

### Can I change my repository name after creating it?

No, the repository name cannot be updated once created.

### Why am I getting "There is another repository using this url" error?

A repository can only be added once to Artifact Hub to avoid duplicates. If someone else has already added a repository that belongs to you, you can claim its ownership.

### How do I force my repository to be reprocessed?

You can force your repository to be processed at any time by updating an existing package version or pushing a new one.

## Helm Charts

### Can I use Artifact Hub as a single charts repository for all the charts listed on it?

No, this is not possible. Artifact Hub allows you to search for charts available in multiple repositories, but it doesn't store or proxy the content in them, only some metadata.

### What is the source of the README file displayed in Artifact Hub?

The README displayed is the one in the chart tgz package. To update it, you can either release a new chart version or update an existing version (making sure the version digest is updated).

### How do I add changelog information to my chart?

The changes are included as a list of entries using an annotation. Each version is expected to provide only the changes it includes, not the full change log. You can see an example in the [Helm annotations documentation](/docs/topics/annotations/helm/).

### Why aren't my chart updates appearing?

The tracker runs every 30 minutes and processes versions that haven't been indexed yet. If the digest of a version changes, that version is indexed again as we consider something must have changed on it.

### How do I add container images for security scanning?

When container images are not defined in the Helm chart annotations, Artifact Hub tries to detect them from the manifests generated by a dry-run install. When the detection isn't accurate, the best way to fix it is by defining the container images manually in the `Chart.yaml` file using the `artifacthub.io/images` annotation.

### Why do old chart versions disappear from Artifact Hub?

Artifact Hub relies on the repository index, so whenever it's truncated, charts not available on it are removed from Artifact Hub as well. We don't store the artifacts themselves, only some of their metadata.

### How do I add OCI-based Helm charts?

For OCI-based Helm charts, you need to setup one Artifact Hub repository per chart. Please see the [Helm OCI support section](/docs/topics/repositories/helm-charts/#oci-support) for more details.

### Can I add my entire OCI registry to Artifact Hub?

Unfortunately, you need to setup one repository for each chart when using OCI-based repositories. The reason it works this way is a combination of how Helm OCI-based repositories work and that the OCI distribution specification doesn't define a mechanism to list all references for a given namespace.

### How do I add the repository metadata file for OCI repositories?

The metadata file needs to be pushed to the OCI registry as well, using a special tag. You can find more details in the [Helm OCI support section](/docs/topics/repositories/helm-charts/#oci-support).

## Authentication

### How do I reset my 2FA?

Do you have the recovery codes provided during the 2FA setup process? If yes, when you are prompted for a code from your 2FA device/app, you can use one of those recovery codes to log in. Please note that those recovery codes can only be used once each.

### Can I change my email address?

At the moment it's not possible to update the email address from the control panel. You can create a new account and, if you have any repositories, transfer them to it from the control panel.

## Self-hosted Deployments

### How do I install Artifact Hub on my own infrastructure?

You can deploy your own Artifact Hub instance using the [official Helm chart](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub). This is the recommended way of deploying your own instance.

### Can I use custom OAuth providers?

No, there isn't support for custom OAuth providers at the moment, but you can use an [OpenID Connect provider](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=values-schema&path=hub.server.oauth.oidc) in your Artifact Hub deployments.

### How do I enable private repositories?

Private repositories are only supported in self-hosted Artifact Hub deployments, not in `artifacthub.io`. You can enable it by setting `hub.server.allowPrivateRepositories` to `true`. Once that's done, you should see the username and password fields in the UI when adding or updating a repository.

### How do I add repositories to my self-hosted instance?

Once you have your Artifact Hub instance up and running, you can add your repositories from the UI control panel like you would do in `artifacthub.io`.

### What's the demo user for self-hosted instances?

When the parameter `dbMigrator.loadSampleData` is set to true (default), a demo user and a couple of sample repositories are registered automatically. The credentials for the demo user are: `demo@artifacthub.io` / `changeme`. You can change the password from the control panel once you log in.

### Can I restrict access to some of the content in my self-hosted instance?

No, there is no way to restrict the visibility of the content available on Artifact Hub, even in your own instance.

## API and integrations

### What are the API rate limits?

The exact numbers are not documented because they are updated every now and then and vary depending on the endpoint used and the current service status. There are some integration endpoints that allow dumping a lot of content in a single request, which may be handy in some cases (e.g. [Harbor replication endpoint](/docs/api/#/Integrations/getHarborReplicationDump)).

### How can I get all charts listed on artifacthub.io without hitting rate limits?

You could use the [Harbor replication endpoint](/docs/api/#/Integrations/getHarborReplicationDump).

### Is there an endpoint to get security reports?

Yes, you can use [this endpoint](/docs/api/#/Packages/getPackageSecurityReport). The security reports are generated using [Trivy](https://trivy.dev/). We store the full output of Trivy (in json format).

## Official Status and Verification

### How do I get the "Official" status for my packages?

The official status is granted manually and needs to be requested via a GitHub issue. Please see the [official status section](/docs/topics/repositories/#official-status) in the repositories guide for more details.

### What's the difference between "Verified Publisher" and "Official"?

The `Verified Publisher` status is automated and shows that the publisher has verified ownership of the repository. The `Official` status is manually granted and indicates that the publisher owns the software a package primarily focuses on.

### Do I need to create an organization to get official status?

Yes, if the repository or package belongs to an organization or company.

## Security Reports

### How does security scanning work?

Security reports are generated using [Trivy](https://trivy.dev/). The latest package version available is scanned **daily**, whereas previous versions are scanned **weekly**. This happens even if nothing has changed in the package version. Versions released more than one year ago or with more than 15 container images won’t be scanned.

### Can I exclude specific images from security scanning?

You can whitelist individual images so that they're not scanned for security vulnerabilities. Note that this is only possible when you define your images manually. You can also disable the security scanner for the entire repository from the control panel.

### Why don't I see security reports for my charts?

The most frequent cause is that we were not able to automatically detect their images. We try to detect them by applying some regular expressions in the output of a dry-run chart install, using the default values. Unfortunately, this mechanism does not always work: sometimes some of the images cannot be detected this way, and sometimes none are found. When this happens, you can provide the images manually by using the `artifacthub.io/images` annotation in the `Chart.yml` file.

### Can I scan private registry images?

No, Artifact Hub does not support scanning images on private registries.

## Getting Help

### How do I report issues with packages listed on Artifact Hub?

For issues with the content listed on `artifacthub.io`, it's best to **contact the particular project directly**. In the links section of the right panel in the package view, you usually may find some links that can point you to the project's repository or the maintainers' emails.

### Where can I find more documentation?

Check these resources:

- [Artifact Hub documentation](/docs)
- [Repositories Guide](/docs/topics/repositories)
- [API Documentation](/docs/api)

### How do I report issues or request features for Artifact Hub itself?

You can create a [discussion](https://github.com/artifacthub/hub/discussions) or [issue](https://github.com/artifacthub/hub/issues) on the Artifact Hub GitHub repository.
