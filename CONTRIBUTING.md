# Contributing Guide

The Artifact Hub project accepts contributions via [GitHub pull requests](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests). This document outlines the process to help get your contribution accepted.

## Issues

Feature requests, bug reports, and support requests all occur through GitHub issues. If you would like to file an issue, view existing issues, or comment on an issue please engage with issues at <https://github.com/artifacthub/hub/issues>.

## Pull Requests

All changes to the source code and documentation are made through [GitHub pull requests](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests). If you would like to make a change to the source, documentation, or other component in the repository please open a pull request with the change.

If you are unsure if the change will be welcome you may want to file an issue first. The issue can detail the change and you can get feedback from the maintainers prior to starting to make the change.

You can find the existing pull requests at <https://github.com/artifacthub/hub/pulls>. For more details about the project **architecture** and **development setup** please see <https://artifacthub.io/docs/topics/architecture/> and <https://artifacthub.io/docs/topics/dev/>.

## Developer Certificate of Origin

The Artifact Hub uses a [Developers Certificate of Origin (DCO)](https://developercertificate.org/) to sign-off that you have the right to contribute the code being contributed. The full text of the DCO reads:

```text
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.
1 Letterman Drive
Suite D4700
San Francisco, CA, 94129

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

Every commit needs to have signoff added to it with a message like:

```text
Signed-off-by: Joe Smith <joe.smith@example.com>
```

Git makes doing this fairly straight forward. First, please use your real name (sorry, no pseudonyms or anonymous contributions).

If you set your `user.name` and `user.email` in your git configuration, you can sign your commit automatically with `git commit -s` or `git commit --signoff`.

Signed commits in the git log will look something like:

```text
Author: Joe Smith <joe.smith@example.com>
Date:   Thu Feb 2 11:41:15 2018 -0800

    Update README

    Signed-off-by: Joe Smith <joe.smith@example.com>
```

Notice how the `Author` and `Signed-off-by` lines match. If they do not match the PR will be rejected by the automated DCO check.

If more than one person contributed to a commit than there can be more than one `Signed-off-by` line where each line is a signoff from a different person who contributed to the commit.


## Dependencies Policy

Dependencies must be evaluated before being introduced to ensure they:

1) are actively maintained
2) are maintained by trustworthy maintainers

These evaluations vary from dependency to dependencies.

Dependencies are also scheduled for removal if that project has been deprecated or if the project is no longer maintained.

CVEs in dependencies will be patched for all supported versions if the CVE is applicable and is assessed as a high or critical severity.
