---
name: Official status request
about: Request official status for a repository
title: "[OFFICIAL] Your repository or project name"
labels: official status request
assignees: ''

---

In Artifact Hub, the `official` status means that the publisher **owns the software** a package primarily focuses on. If we consider the *example* of a [chart used to install Consul](https://artifacthub.io/packages/helm/hashicorp/consul), to obtain the `official` status the publisher should be the owner of the Consul software (*HashiCorp* in this case), not just the chart. Similarly, a [Tekton task used to perform operations on Google Cloud](https://artifacthub.io/packages/tekton-task/tekton-catalog-tasks/gcloud) would need to be published by *Google* to be marked as `official`. In the case of a MySQL operator, only one published by *MySQL/Oracle* would be considered `official`.

The `official` status can be granted at the **repository or package level**. When it is granted for a repository, all packages available on it will display the `official` badge, so all packages in the repository **must** be official. If only some of the packages in your repository are official, please list them in the `Official packages` field below.

- **Repository name** *(in `artifacthub.io`)*: ...
- **Official packages** *(leave empty if all packages in the repository are official)*: ...
- **Project URL:** ...
- **Is the publisher a CNCF project? (graduated, incubating or sandbox):** ...
- **Source code URL** *(if available)*: ...
- **Other relevant URLs:** *if there are any other urls that can help us with the verification process, please include them here*

**Before applying for this status, please make sure your repository complies with the following requirements:**

- [ ] The repository has already obtained the [Verified Publisher](https://artifacthub.io/docs/topics/repositories/#verified-publisher) status.
- [ ] The user requesting the status is the publisher of the repository in Artifact Hub, or belongs to the organization publishing it.
- [ ] All official packages available in the repository provide a `README.md` file with some documentation that can be displayed on Artifact Hub.
