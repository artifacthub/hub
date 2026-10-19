# Artifact Hub CLI tool (ah)

Artifact Hub includes a command line interface tool named `ah`. You can check that your packages are ready to be listed on AH by using the `lint` subcommand.

Integrating the linter into your CI workflow may help catching errors early. You can find an example of how to do it with GitHub Actions [here](https://github.com/artifacthub/hub/blob/ac49ca921ac7c7711b03d0701f52c33acaaaa6f9/.github/workflows/ci.yml#L28-L37).

## Install

You can install the pre-compiled binary, use Docker or compile from source.

### Pre-compiled binary

Pre-compiled binaries for MacOS, Linux and Windows are available at the [releases page](https://github.com/artifacthub/hub/releases). You can also install it using `Homebrew` or `Scoop`.

#### Homebrew

```sh
brew install artifacthub/cmd/ah
```

#### Scoop

```sh
scoop bucket add artifacthub https://github.com/artifacthub/scoop-cmd.git
scoop install artifacthub/ah
```

### Docker

You can run `ah` from a Docker container. The latest Docker image available can be found in the [Docker Hub](https://hub.docker.com/r/artifacthub/ah/tags).

### Compiling from source

To compile from source you'll need [Go](https://golang.org/dl/) installed. Once you are ready to go, please follow these steps:

```sh
git clone https://github.com/artifacthub/hub
cd hub/cmd/ah
go install
```

## Usage

Please run `ah help` for more information about the different subcommands and the options available.

### Linting Tekton catalogs using git-based versioning

When linting Tekton catalogs that use the git-based versioning option (`--tekton-versioning git`), `ah` checks out each semver tag available in the git repository to process the corresponding version of the packages, restoring the original `HEAD` once it's done. Please note that:

- The git working tree must not contain uncommitted changes (untracked files are ignored).
- The repository's tags must be available locally. Shallow clones may not include them, so please fetch them first (e.g. `git fetch --tags --unshallow`). When using the GitHub `actions/checkout` action, you can set `fetch-depth: 0` to fetch all history and tags.

```sh
ah lint --kind tekton-task --path task --tekton-versioning git
```

### Ignoring package versions

Some package versions may contain errors that cannot be fixed anymore (e.g. immutable releases already published). The `--ignore` flag allows excluding them from the lint result using the format `name[@version]`, and it can be used multiple times. Ignored package versions are still displayed in the lint report, but their errors do not make the lint fail.

- The name must match the package name exactly.
- The version is a regular expression matched against the package version normalized as semver (e.g. the tag `v1.0.1` is matched as `1.0.1`). It is not anchored, so `1.0.1` would also match `11.0.10`. Please use something like `^1\.0\.1$` to match a single version.
- When the version is omitted, all versions of the package are ignored. This is also the only way to ignore a package version whose version is unknown (e.g. when it is missing in the package metadata).
- Packages whose name cannot be read from their metadata cannot be ignored.

```sh
ah lint --kind tekton-task --path task --tekton-versioning git --ignore 'git-clone@^1\.0\.1$' --ignore 'git-clone@^1\.2\.0$'
```
