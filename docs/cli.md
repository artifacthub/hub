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
