# Repositories guide

Artifact Hub allows publishers to list their content in an automated way. Publishers can add their repositories from the control panel, accessible from the top right menu after signing in. It's possible to create an organization and add repositories to it instead of adding them to the user's account. Repositories will be indexed periodically to always display the most up-to-date content.

The following repositories kinds are supported at the moment:

- [Argo templates repositories](https://github.com/artifacthub/hub/blob/master/docs/argo_templates_repositories.md)
- [Backstage plugins repositories](https://github.com/artifacthub/hub/blob/master/docs/backstage_plugins_repositories.md)
- [Containers images repositories](https://github.com/artifacthub/hub/blob/master/docs/container_images_repositories.md)
- [CoreDNS plugins repositories](https://github.com/artifacthub/hub/blob/master/docs/coredns_plugins_repositories.md)
- [Falco rules repositories](https://github.com/artifacthub/hub/blob/master/docs/falco_rules_repositories.md)
- [Headlamp plugins repositories](https://github.com/artifacthub/hub/blob/master/docs/headlamp_plugins_repositories.md)
- [Helm charts repositories](https://github.com/artifacthub/hub/blob/master/docs/helm_charts_repositories.md)
- [Helm plugins repositories](https://github.com/artifacthub/hub/blob/master/docs/helm_plugins_repositories.md)
- [Inspektor gadgets repositories](https://github.com/artifacthub/hub/blob/master/docs/inspektor_gadgets_repositories.md)
- [KCL modules repositories](https://github.com/artifacthub/hub/blob/master/docs/kcl_modules_repositories.md)
- [KEDA scalers repositories](https://github.com/artifacthub/hub/blob/master/docs/keda_scalers_repositories.md)
- [Keptn integrations repositories](https://github.com/artifacthub/hub/blob/master/docs/keptn_integrations_repositories.md)
- [Knative client plugins repositories](https://github.com/artifacthub/hub/blob/master/docs/knative_client_plugins_repositories.md)
- [Krew kubectl plugins repositories](https://github.com/artifacthub/hub/blob/master/docs/krew_kubectl_plugins_repositories.md)
- [KubeArmor policies repositories](https://github.com/artifacthub/hub/blob/master/docs/kubearmor_policies_repositories.md)
- [Kubewarden policies repositories](https://github.com/artifacthub/hub/blob/master/docs/kubewarden_policies_repositories.md)
- [Kyverno policies repositories](https://github.com/artifacthub/hub/blob/master/docs/kyverno_policies_repositories.md)
- [Meshery designs repositories](https://github.com/artifacthub/hub/blob/master/docs/meshery_designs_repositories.md)
- [OLM operators repositories](https://github.com/artifacthub/hub/blob/master/docs/olm_operators_repositories.md)
- [OPA policies repositories](https://github.com/artifacthub/hub/blob/master/docs/opa_policies_repositories.md)
- [OpenCost plugins repositories](https://github.com/artifacthub/hub/blob/master/docs/opencost_plugins_repositories.md)
- [Radius recipes repositories](https://github.com/artifacthub/hub/blob/master/docs/radius_recipes_repositories.md)
- [Tekton pipelines repositories](https://github.com/artifacthub/hub/blob/master/docs/tekton_pipelines_repositories.md)
- [Tekton tasks repositories](https://github.com/artifacthub/hub/blob/master/docs/tekton_tasks_repositories.md)
- [Tekton stepactions repositories](https://github.com/artifacthub/hub/blob/master/docs/tekton_stepactions_repositories.md)
- [Tinkerbell actions repositories](https://github.com/artifacthub/hub/blob/master/docs/tinkerbell_actions_repositories.md)

This guide also contains additional information about the following repositories topics:

- [Repositories guide](#repositories-guide)
  - [Verified publisher](#verified-publisher)
  - [Official status](#official-status)
  - [Ownership claim](#ownership-claim)
  - [Private repositories](#private-repositories)

## Verified publisher

Repositories and the packages they provide can display a special label named `Verified publisher`. This label indicates that the repository publisher *owns or has control* over the repository. Users may rely on it to decide if they want to use a given package or not.

Publishers can be verified through the [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file. In the repositories tab in the Artifact Hub control panel, the repository identifier is exposed on each repository's card (ID). To proceed with the verification, an `artifacthub-repo.yml` metadata file must be added to the repository including that **ID** in the `repositoryID` field. The next time the repository is processed, the verification will be checked and the flag will be enabled if it succeeds.

*Please note that the **artifacthub-repo.yml** metadata file must be located at the repository URL's path. In Helm repositories, for example, this means it must be located at the same level of the chart repository **index.yaml** file, and it must be served from the chart repository HTTP server as well.*

*The verified publisher flag won't be set until the next time the repository is processed. Please keep in mind that the repository won't be processed if it hasn't changed since the last time it was processed. Depending on the repository kind, this is checked in a different way. For Helm http based repositories, we consider it has changed if the `index.yaml` file changes (the `generated` field is ignored when performing this check). For git based repositories, it does when the hash of the last commit in the branch you set up changes.*

## Official status

In Artifact Hub, the `official` status means that the publisher **owns the software** a package primarily focuses on. If we consider the *example* of a [chart used to install Consul](https://artifacthub.io/packages/helm/hashicorp/consul), to obtain the `official` status the publisher should be the owner of the Consul software (*HashiCorp* in this case), not just the chart. Similarly, a [Tekton task used to perform operations on Google Cloud](https://artifacthub.io/packages/tekton-task/tekton-catalog-tasks/gcloud) would need to be published by *Google* to be marked as `official`. In the case of a MySQL operator, only one published by *MySQL/Oracle* would be considered `official`.

The `official` status can be granted at the repository or package level. When it is granted for a repository, all packages available on it will display the `official` badge, so all packages in the repository **must** be official. If only some of the packages in your repository are official, please list them in the `Official packages` field when submitting the official status request.

**Before applying for this status, please make sure your repository complies with the following requirements:**

- The repository has already obtained the [Verified publisher](https://artifacthub.io/docs/topics/repositories/#verified-publisher) status.
- The user requesting the status is the publisher of the repository in Artifact Hub, or belongs to the organization publishing it.
- All official packages available in the repository provide a `README.md` file with some documentation that can be displayed on Artifact Hub.

Once you have verified that the requirements are met, please file an issue [using this template](https://github.com/artifacthub/hub/issues/new?assignees=&labels=official+status+request&template=official-status-request.md&title=%5BOFFICIAL%5D+Your+repository+or+project+name) to apply.

## Ownership claim

Any user is free to add any repository they wish to Artifact Hub. In some situations, legit owners may want to claim the ownership on an already published repository in order to publish it themselves. This process can be easily done in an automated way from the Artifact Hub control panel.

First, an [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) metadata file must be added to the repository you want to claim the ownership for. Only the `owners` section of the metadata file is required to be set up for this process. The `repositoryID` field can be omitted as the user claiming the ownership doesn't know it yet. The user requesting the ownership claim **must** appear in the list of owners in the metadata file, and the email listed **must** match with the one used to sign in in Artifact Hub. This information will be used during the process to verify that the requesting user actually owns the repository.

Once the repository metadata file has been set up, you can proceed from the Artifact Hub control panel. In the repositories tab, click on `Claim Ownership`. You'll need to enter the repository you'd like to claim the ownership for, as well as the destination entity, which can be the user performing the request or an organization. If the metadata file was set up correctly, the process should complete successfully.

*Please note that the **artifacthub-repo.yml** metadata file must be located at the repository URL's path. In Helm repositories, for example, this means it must be located at the same level of the chart repository **index.yaml** file, and it must be served from the chart repository HTTP server as well.*

## Private repositories

Artifact Hub supports adding private repositories (except OLM OCI based). By default this feature is disabled, but you can enable it in your own Artifact Hub deployment setting the `hub.server.allowPrivateRepositories` configuration setting to `true`. When enabled, you'll be allowed to add the authentication credentials for the repository in the add/update repository modal in the control panel. Credentials are not exposed in the Artifact Hub UI, so users will need to get them separately. The installation instructions modal will display a warning to users when the package displayed belongs to a private repository.

*Please note that this feature is not enabled in `artifacthub.io`.*
