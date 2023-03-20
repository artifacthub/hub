## KubeArmor policies repositories

KubeArmor policies repositories are expected to be hosted in GitHub, GitLab or Bitbucket repos. When adding your repository to Artifact Hub, the url used **must** follow the following format:

- `https://github.com/user/repo[/path/to/packages]`
- `https://gitlab.com/user/repo[/path/to/packages]`
- `https://bitbucket.org/user/repo[/path/to/packages]`

By default the `master` branch is used, but it's possible to specify a different one from the UI.

*Please NOTE that the repository URL used when adding the repository to Artifact Hub **must NOT** contain the git hosting platform specific parts, like **tree/branch**, just the path to your packages like it would show in the filesystem.*

The *path to packages* provided can contain one or more packages. Each package version **must** be on a separate folder. You can have multiple policies in a single package, or create a package for each policy, it's completely up to you. In the same way, you can decide if you want to provide one or multiple versions of your policies packages.

The structure of a repository with multiple packages and versions could look something like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
├── package1
│   ├── 1.0.0
│   │   ├── README.md
│   │   ├── artifacthub-pkg.yml
│   │   ├── more
│   │   │   └── policy3.yaml
│   │   ├── policy1.yaml
│   │   └── policy2.yaml
│   └── 2.0.0
│       ├── README.md
│       ├── artifacthub-pkg.yml
│       └── policy1.yaml
└── package2
    └── 1.0.0
        ├── README.md
        ├── artifacthub-pkg.yml
        └── policy1.yaml
```

This structure is flexible, and in some cases where you only have a package and a version it can be greatly simplified. In the case of a single package with a single version available at a time (the publisher doesn't want to make previous ones available, for example), the structure could look like this:

```sh
$ tree path/to/packages
path/to/packages
├── artifacthub-repo.yml
└── package1
    ├── README.md
    ├── artifacthub-pkg.yml
    ├── policy1.yaml
    └── policy2.yaml
```

In the previous case, even the `package1` directory could be omitted. The reason is that both packages names and versions are read from the `artifacthub-pkg.yml` metadata file, so directories names are not used at all.

Each package version **needs** an `artifacthub-pkg.yml` metadata file. Please see the file [spec](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml) for more details. Policies files **must** have the `.yaml` extension. If you want to exclude some paths in your package from the indexing, you can do it using the `ignore` field in your [package metadata file](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-pkg.yml), which uses `.gitignore` syntax.

The [artifacthub-repo.yml](https://github.com/artifacthub/hub/blob/master/docs/metadata/artifacthub-repo.yml) repository metadata file shown above can be used to setup features like [Verified publisher](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#verified-publisher) or [Ownership claim](https://github.com/artifacthub/hub/blob/master/docs/repositories.md#ownership-claim). This file must be located at `/path/to/packages`.

Once you have added your repository, you are all set up. As you add new versions of your policies or even new policies packages to your git repository, they'll be automatically indexed and listed in Artifact Hub.
