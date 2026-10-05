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
