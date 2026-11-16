---
name: Official status request
about: Request official status for a repository
title: "[OFFICIAL] Your repository or project name"
labels: official status request
assignees: ''

---

In Artifact Hub, the `official` status means that the publisher **owns the software** a package primarily focuses on. It lets users know that a package is provided by the creators or maintainers of that software, which is often a good indication of what to expect from it and helps them make decisions when choosing among multiple options. For this reason, it is only granted when users would clearly recognize the package as the official one. Please note that Artifact Hub does not review the quality of official packages.

Owning the package is not enough to obtain it. The `official` status **cannot be granted** when:

- **The package focuses on software owned by someone else.** A [chart used to install Consul](https://artifacthub.io/packages/helm/hashicorp/consul) would need to be published by the owner of the Consul software (*HashiCorp* in this case), not just the owner of the chart. The same applies to operators, exporters, plugins or integrations built for someone else's software, even if you wrote them from scratch or yours is the only option available: a MySQL operator would need to be published by *MySQL/Oracle*, and a [Tekton task used to perform operations on Google Cloud](https://artifacthub.io/packages/tekton-task/tekton-catalog-tasks/gcloud) by *Google* (not by *Tekton*).
- **The package name includes the name of a product or organization the publisher doesn't own.** Users could think the package is provided or endorsed by them. For example, a package named `kubernetes-dashboard` would need to be published by the *Kubernetes* project.
- **The package name is generic.** A name that describes a category or a task (like `backup-operator` or `pdf-converter`) could be used by multiple packages with a similar purpose, and none of them should have this status over the others. A name that uniquely identifies your software works fine.

The `official` status can be granted at the **repository or package level**. When it is granted for a repository, all packages available on it will display the `official` badge, so all packages in the repository **must** be official. If only some of the packages in your repository are official, please list them in the `Official packages` field below.

- **Repository name** *(in `artifacthub.io`)*: ...
- **Official packages** *(leave empty if all packages in the repository are official)*: ...
- **Project URL:** ...
- **Is the publisher a CNCF project? (graduated, incubating or sandbox):** ...
- **Source code URL** *(if available)*: ...
- **Other relevant URLs:** *if there are any other urls that can help us verify that the publisher owns the software, please include them here*

**Before applying for this status, please make sure your repository complies with the following requirements:**

- [ ] The repository has already obtained the [Verified Publisher](https://artifacthub.io/docs/topics/repositories/#verified-publisher) status.
- [ ] The user requesting the status is the publisher of the repository in Artifact Hub, or belongs to the organization publishing it.
- [ ] If the package belongs to an organization or company, the repository is published under that organization in Artifact Hub, not under a user account. You can create an organization and transfer the repository to it from the control panel.
- [ ] All official packages available in the repository provide a `README.md` file with some documentation that can be displayed on Artifact Hub.
