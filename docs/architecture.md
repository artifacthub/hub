# Architecture

This document describes the architecture of **Artifact Hub**, detailing each of the components, what they do and where they are located in the source repository.

## Repository layout

The following directories present at the top level of the repository represent some of the key locations in the codebase:

```sh
hub
├── .github
├── charts
├── cmd
├── database
├── docs
├── internal
├── web
└── widget
```

- **.github:** contains the GitHub Actions workflows as well as the issue templates.

- **charts/artifact-hub:** contains the Artifact Hub Helm chart, which is the recommended installation method.

- **cmd:** contains the source code of the backend applications and the CLI tool: `hub`, `tracker`, `scanner` and `ah`.

- **database:** contains all code related to the database layer, such as the schema migrations, functions and tests.

- **docs:** contains the project documentation.

- **internal:** contains the source code of the internal APIs used by the backend applications.

- **web:** contains the source code of the web application.

- **widget:** contains the source code of the widget application.

## Layers

Artifact Hub is structured in multiple layers, each of them providing a set of services to the adjacent layer.

- **Database:** this is the innermost layer and provides data services to the `Internal APIs` layer. This layer controls the database [schema and its migrations](https://github.com/artifacthub/hub/tree/master/database/migrations/schema). It also provides a set of [functions](https://github.com/artifacthub/hub/tree/master/database/migrations/functions) that will act as an API for outer layers, abstracting them in most cases from the internal database structure. Artifact Hub uses PostgreSQL as datastore. Please see the [database](#database) section for more details.

- **Internal APIs:** this layer represents a set of Go APIs that allow performing all operations supported by Artifact Hub, such as registering a repository or a new package, adding an organization or creating a webhook. This layer communicates with the `Database` layer using the API provided, and exposes a higher level Go API to the different backend applications. Please see the [internal APIs](#internal-apis) section for more details.

- **Backend applications:** this layer represents the applications that form the backend: `hub`, `tracker` and `scanner`. These applications rely on the `Internal APIs` layer to perform their tasks. Please see the [backend applications](#backend-applications) section for more details.

- **Web and widget applications:** this layer represents the Artifact Hub's web user interface. It uses the HTTP API exposed from the `hub` to interact with the backend. Please see the [web application](#web-application) section for more details.

- **CLI tool:** Artifact Hub includes a CLI tool named `ah`. Please see its [documentation](https://github.com/artifacthub/hub/blob/master/docs/cli.md) for more details.

## Database

The `database` layer is defined by the database [schema](https://github.com/artifacthub/hub/tree/master/database/migrations/schema) and a set of [functions](https://github.com/artifacthub/hub/tree/master/database/migrations/functions), which are handled using migrations. Migrations use [Tern](https://github.com/jackc/tern), and are automatically applied during the installation and upgrades by a Kubernetes [job](https://github.com/artifacthub/hub/blob/master/charts/artifact-hub/templates/db_migrator_install_job.yaml) named `db-migrator`. There are [unit tests](https://github.com/artifacthub/hub/tree/master/database/tests) available for both the schema and the functions.

```sh
database
├── migrations
│   ├── functions
│   │   └── ...
│   └── schema
│       └── ...
└── tests
    ├── functions
    │   └── ...
    └── schema
        └── ...
```

Some of the available functions accept `json` as input and also return `json` data. In some cases, this `json` data prepared in the database is proxied from the `Internal APIs` layer to upper layers to be consumed as is. An example of this would be the [get_package](https://github.com/artifacthub/hub/blob/master/database/migrations/functions/packages/get_package.sql) function.

## Internal APIs

This layer represents a set of **Go APIs** that will be used by the final backend applications. It abstracts upper layers from the database, while adding some functionality on top of it.

The APIs available are structured in **packages**, which are located in the `internal` directory:

```sh
internal
├── apikey
├── authz
├── email
├── event
├── hub
├── img
├── license
├── notification
├── org
├── pkg
├── repo
├── scanner
├── stats
├── subscription
├── tests
├── tracker
├── user
├── util
└── webhook
```

Each of the packages provides an API to perform certain operations. As an example, the `repo` package provides a `Manager` that implements the `RepositoryManager` interface, which defines all operations that apply to repositories:

```go
type RepositoryManager interface {
    Add(ctx context.Context, orgName string, r *Repository) error
    CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error)
    ClaimOwnership(ctx context.Context, name, orgName string) error
    Delete(ctx context.Context, name string) error
    GetByID(ctx context.Context, repositoryID string, includeCredentials bool) (*Repository, error)
    GetByName(ctx context.Context, name string, includeCredentials bool) (*Repository, error)
    GetMetadata(mdFile string) (*RepositoryMetadata, error)
    GetPackagesDigest(ctx context.Context, repositoryID string) (map[string]string, error)
    GetRemoteDigest(ctx context.Context, r *Repository) (string, error)
    Search(ctx context.Context, input *SearchRepositoryInput) (*SearchRepositoryResult, error)
    SearchJSON(ctx context.Context, input *SearchRepositoryInput) (*JSONQueryResult, error)
    SetLastScanningResults(ctx context.Context, repositoryID, errs string) error
    SetLastTrackingResults(ctx context.Context, repositoryID, errs string) error
    SetVerifiedPublisher(ctx context.Context, repositoryID string, verified bool) error
    Transfer(ctx context.Context, name, orgName string, ownershipClaim bool) error
    Update(ctx context.Context, r *Repository) error
    UpdateDigest(ctx context.Context, repositoryID, digest string) error
}
```

This package is imported by the applications in the upper layer, like the `hub`, to expose some of this functionality in the HTTP API, or the `tracker`, to process and index packages available in repositories.

## Backend applications

The backend applications are `hub`, `tracker` and `scanner`. They are located in the `cmd` directory. Each of the applications' directory contains a `Dockerfile` that will be used to build the corresponding Docker image.

```sh
cmd
├── hub
│   ├── Dockerfile
│   ├── handlers
│   └── main.go
├── scanner
│   ├── Dockerfile
│   └── main.go
└── tracker
    ├── Dockerfile
    └── main.go
```

- **hub:** this component provides an HTTP API that exposes some of the functionality provided by the `Internal APIs` layer. The documentation for this API can be found [here](https://artifacthub.io/docs/api/). It is also in charge of serving the web application static assets, as well as handling notifications and events.

- **tracker:** this component is in charge of indexing all repositories registered in the database. It's launched periodically from a Kubernetes [cronjob](https://github.com/artifacthub/hub/blob/master/charts/artifact-hub/templates/tracker_cronjob.yaml).

- **scanner:** this component scans Docker images in registered packages for security vulnerabilities using [Trivy](https://github.com/aquasecurity/trivy). Similarly to the `tracker`, it is launched periodically from a Kubernetes [cronjob](https://github.com/artifacthub/hub/blob/master/charts/artifact-hub/templates/scanner_cronjob.yaml).

## Web application

The Artifact Hub's user interface is a single page application written in TypeScript using React. Its source code can be found in the `web` directory.

```sh
web
├── public
└── src
    ├── api
    ├── context
    ├── hooks
    ├── layout
    ├── themes
    └── utils
```

- **public:** contains the base `index.html` file as well as some static assets, like images and fonts.

- **src/api:** contains a wrapper to interact with the HTTP API exposed by the `hub`.

- **src/context:** context used for the user profile and preferences across the entire app.

- **src/hooks:** contains some custom React hooks.

- **src/layout:** contains all React components. They are organized in different folders corresponding to the section of the UI they belong to.

- **src/themes:** contains the stylesheets for the light and dark themes.

- **src/utils:** contains some utilities used by the components.

## Development environment setup

For more information about how to setup your development environment, please see [this guide](https://github.com/artifacthub/hub/blob/master/docs/dev.md).
