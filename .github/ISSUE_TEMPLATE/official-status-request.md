---
name: Official status request
about: Request official status for a repository
title: "[OFFICIAL] Your repository or project name"
labels: official status request
assignees: ''

---

In Artifact Hub, the `official` status means that the publisher **owns the software deployed** by *all* the packages available in the repository. If we consider the *example* of a [chart used to install Consul](https://artifacthub.io/packages/helm/hashicorp/consul), to obtain the `official` status the publisher should be the owner of the Consul software (HashiCorp in this case), not just the chart. When this status is granted for a repository, all packages available on it will display the `official` badge, so all packages in the repository **must** be official.

- **Repository name** *(in `artifacthub.io`)*: ...
- **Project URL:** ...
- **Source code URL** *(if available)*: ...
- **Other relevant URLs:** *if there are any other urls that can help us with the verification process, please include them here*

**Before submitting this request, please confirm that your repository complies with the following requirements:**

- [ ] The repository has already obtained the [Verified Publisher](https://artifacthub.io/docs/topics/repositories/#verified-publisher) status.
- [ ] The repository *only* contains `official` packages. A mix of official and non-official packages is not allowed at the moment, but we are considering to allow the `official` status to be set [at the package level](https://github.com/artifacthub/hub/issues/972) and this might change in the future.
- [ ] The user requesting the status is the publisher of the repository in Artifact Hub, or belongs to the organization publishing it.
- [ ] The packages available in the repository provide a `README.md` file with some documentation that can be displayed on Artifact Hub.
