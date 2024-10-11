# Development environment setup

This document will help you setup your development environment so that you can build, test and run Artifact Hub locally from source.

The instructions provided in this document rely on a set of [aliases](#aliases) available at the end of this document. These aliases are used by some of the maintainers and are provided only as examples. Please feel free to adapt them to suit your needs. You may want to add them to your shell's configuration file so that they are loaded automatically.

To start, please clone the [Artifact Hub repository](https://github.com/artifacthub/hub). If you plan to use the aliases mentioned above, you should set the `HUB_SOURCE` variable to the path where you cloned the repository.

## Database

The datastore used by Artifact Hub is PostgreSQL. You can install it locally using your favorite OS package manager. The [pg_partman](https://github.com/pgpartman/pg_partman) extension must be installed as well.

Once PostgreSQL is installed and its binaries are available in your `PATH`, we can initialize the database cluster and launch the database server:

```sh
hub_db_init
hub_db_server
```

Once the database server is up an running, we can create the `hub` database and we'll be ready to go:

```sh
hub_db_create
```

### Migrations

[Database migrations](https://github.com/artifacthub/hub/tree/master/database/migrations) are managed using [Tern](https://github.com/jackc/tern). Please [install it](https://github.com/jackc/tern#installation) before proceeding. The database schema and functions are managed with migrations.

We need to create a configuration file so that Tern knows how to connect to our database. We'll create a file called `tern.conf` inside `~/.cfg` with the following content (please adjust if needed):

```ini
[database]
host = localhost
port = 5432
database = hub
user = postgres

[data]
loadSampleData = true
```

Now that the `hub` database server is up and ready, we just need to apply all available migrations using the following command:

```sh
hub_db_migrate
```

At this point our database is ready to launch our local instance of Artifact Hub and start doing some work on it.

### Database tests

If you plan to do some work on the database layer, some extra setup is needed to be able to run the database tests. [Schema and database functions are tested](https://github.com/artifacthub/hub/tree/master/database/tests) using the unit testing framework [pgTap](https://pgtap.org), so you need to [install](https://pgtap.org/documentation.html#installation) the pgTap PostgreSQL extension on your machine. To run the tests you will also need to install a perl tool called [pg_prove](https://pgtap.org/pg_prove.html) from CPAN (`cpan TAP::Parser::SourceHandler::pgTAP`).

Similarly to what we did during our initial database setup, we'll create a configuration file for Tern for the tests database in the same folder (`~/.cfg`), called `tern-tests.conf` with the following content (please adjust if needed):

```ini
[database]
host = localhost
port = 5432
database = hub_tests
user = postgres

[data]
loadSampleData = false
```

Once you have all the tooling required installed and the tests database set up, you can run all database tests as often as you need this way:

```sh
hub_db_recreate_tests && hub_db_tests
```

### Docker

If you opt for running PostgreSQL locally using Docker, [this Dockerfile](https://github.com/artifacthub/hub/blob/master/database/tests/Dockerfile-postgres) used to build the images used by the [CI workflow](https://github.com/artifacthub/hub/blob/master/.github/workflows/ci.yml) can be helpful as a starting point. Image used by the CI workflow can be found in the Docker Hub as [artifacthub/postgres-pgtap](https://hub.docker.com/r/artifacthub/postgres-pgtap).

## Backend

The backend is written in [Go](https://golang.org). Go installation instructions can be found [here](https://golang.org/doc/install). This repository uses Go modules.

Even if you don't plan to do any work on the frontend, you will probably need to build it once if you want to interact with the Artifact Hub backend from the browser. To do this, you will have to install [yarn](https://yarnpkg.com/getting-started/install). Once you have it installed, you can build the frontend application this way:

```sh
cd web && yarn install
hub_frontend_build
```

### Hub server

Once you have a working Go development environment set up and the web application built, it's time to launch the `hub` server. Before running it, we'll need to create a configuration file in `~/.cfg` named `hub.yaml` with the following content (please adjust as needed):

```yaml
log:
  level: debug
  pretty: true
db:
  host: localhost
  port: "5432"
  database: hub
  user: postgres
server:
  addr: localhost:8000
  metricsAddr: localhost:8001
  shutdownTimeout: 10s
  webBuildPath: ../../web/build
  widgetBuildPath: ../../widget/build
  basicAuth:
    enabled: false
    username: hub
    password: changeme
  cookie:
    hashKey: default-unsafe-key
    secure: false
theme:
  colors:
    primary: "#417598"
    secondary: "#2D4857"
  images:
    appleTouchIcon192: "/static/media/logo192_v2.png"
    appleTouchIcon512: "/static/media/logo512_v2.png"
    openGraphImage: "/static/media/artifactHub_v2.png"
    shortcutIcon: "/static/media/logo_v2.png"
    websiteLogo: "/static/media/logo/artifacthub-brand-white.svg"
  siteName: "Artifact Hub"
  sampleQueries:
    - name: Packages from verified publishers
      querystring: "verified_publisher=true"
    - name: Operators with auto pilot capabilities
      querystring: "capabilities=auto+pilot"
    - name: Helm Charts in the storage category
      querystring: "kind=0&ts_query=storage"
```

This sample configuration does not use all options available. For more information please see [the Chart configuration options](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub?modal=values-schema) and [the Chart hub secret template file](https://github.com/artifacthub/hub/blob/master/charts/artifact-hub/templates/hub_secret.yaml).

Now you can run the `hub` server:

```sh
hub_server
```

Once your `hub` server is up and running, you can point your browser to [http://localhost:8000](http://localhost:8000) and you should see the Artifact Hub web application.

The `hub_server` alias runs the `hub` cmd, one of the two processes of the Artifact Hub backend. This process launches an http server that serves the web application and the API that powers it, among other things.

### Tracker

The `tracker` is another backend cmd in charge of indexing registered repositories metadata. On production deployments, it is usually run periodically using a `cronjob` on Kubernetes. Locally while developing, you can just run it as often as you need as any other CLI tool. The tracker requires the [OPM cli tool](https://github.com/operator-framework/operator-registry/releases) to be installed and available in your PATH, and the [TensorFlow C library](https://www.tensorflow.org/install/lang_c), so please make sure it's available before proceeding.

If you opened the url suggested before, you probably noticed there were no packages listed yet. This happened because no repositories had been indexed yet. If you used the configuration file suggested for Tern, some sample repositories should have been registered in the database owned by the `demo` user. To index them, we need to run the `tracker`.

Similarly to the `hub` server, the `tracker` can be configured using a `yaml` file. We'll create one in `~/.cfg` named `tracker.yaml` with the following content (adjust as needed as usual ;):

```yaml
log:
  level: debug
  pretty: true
db:
  db:
  host: localhost
  port: "5432"
  database: hub
  user: postgres
tracker:
  concurrency: 1
  repositoriesNames: []
  repositoriesKinds: []
  bypassDigestCheck: false
  categoryModelPath: ../../ml/category/model
images:
  store: pg
```

Once the configuration file is ready, it's time to launch the `tracker` for the first time:

```sh
hub_tracker
```

Depending on the speed of your Internet connection and machine, this may take a few minutes. The first time it runs a full indexing will be done. Subsequent runs will only process packages that have changed, so it'll be much faster. Once the tracker has completed, you should see packages in the web application. *Please note that some API responses can be cached for up to 5 minutes.*

### Scanner

There is another backend cmd called `scanner`, which is in charge of scanning the packages images for security vulnerabilities, generating security reports for them. On production deployments, it is usually run periodically using a `cronjob` on Kubernetes. Locally while developing, you can just run it as often as you need as any other CLI tool.

The scanner requires [Trivy](https://github.com/aquasecurity/trivy#installation) to be installed and available in your PATH. Before launching the scanner, you need to run `Trivy` in server mode:

```sh
hub_trivy_server
```

The `scanner` is setup and run in the same way as the `tracker`. There is also an alias for it named `hub_scanner`.

```sh
hub_scanner
```

### Backend tests

You can use the command below to run all backend tests:

```sh
hub_backend_tests
```

## Frontend

The Artifact Hub frontend is a single page application written in TypeScript using React.

In the backend we detailed how to install the frontend dependencies and build it. That should be enough if you are only going to work on the backend. However, if you are planning to work on the frontend, it's better to launch an additional server which will rebuild the web application as needed whenever a file is modified.

The frontend development server can be launched using the following command:

```sh
hub_frontend_dev
```

That alias will launch an http server that will listen on the port 3000. Once it's running, you can point your browser to [http://localhost:3000](http://localhost:3000) and you should see the Artifact Hub web application. The page will be automatically reloaded everytime you make a change in the code. Build errors and build warnings will be visible in the console.

API calls will go to [http://localhost:8000](http://localhost:8000), so the `hub` server is expected to be up and running.

### Frontend tests and linter

You can use the command below to run all frontend tests:

```sh
hub_frontend_tests
```

In addition to running the tests, you may also be interested in running the linter. To do that, you can run:

```sh
hub_frontend_lint_fix
```

## Aliases

The following aliases are used by some of the maintainers and are provided only as examples. Please feel free to adapt them to suit your needs.

```sh
export HUB_SOURCE=~/projects/hub
export HUB_DATA=~/tmp/data_hub
export HUB_DB_BACKUP=~/tmp/artifacthub-backup.local.sql

alias hub_db_init="mkdir -p $HUB_DATA && initdb -U postgres $HUB_DATA"
alias hub_db_create="psql -U postgres -c 'create database hub'"
alias hub_db_create_tests="psql -U postgres -c 'create database hub_tests' && psql -U postgres hub_tests -c 'create extension if not exists pgtap'"
alias hub_db_drop="psql -U postgres -c 'drop database hub'"
alias hub_db_drop_tests="psql -U postgres -c 'drop database if exists hub_tests'"
alias hub_db_recreate="hub_db_drop && hub_db_create && hub_db_migrate"
alias hub_db_recreate_tests="hub_db_drop_tests && hub_db_create_tests && hub_db_migrate_tests"
alias hub_db_server="postgres -D $HUB_DATA"
alias hub_db_client="psql -U postgres hub"
alias hub_db_client_tests="psql -U postgres hub_tests"
alias hub_db_migrate="pushd $HUB_SOURCE/database/migrations; TERN_CONF=~/.cfg/tern.conf ./migrate.sh; popd"
alias hub_db_migrate_tests="pushd $HUB_SOURCE/database/migrations; TERN_CONF=~/.cfg/tern-tests.conf ./migrate.sh; popd"
alias hub_db_tests="pushd $HUB_SOURCE/database/tests; pg_prove --host localhost --dbname hub_tests --username postgres --verbose **/*.sql; popd"
alias hub_db_backup="pg_dump --data-only --exclude-table-data=repository_kind --exclude-table-data=event_kind -U postgres hub > $HUB_DB_BACKUP"
alias hub_db_restore="psql -U postgres hub < $HUB_DB_BACKUP"
alias hub_server="pushd $HUB_SOURCE/cmd/hub; go run -mod=readonly *.go; popd"
alias hub_tracker="pushd $HUB_SOURCE/cmd/tracker; go run -mod=readonly main.go; popd"
alias hub_scanner="pushd $HUB_SOURCE/cmd/scanner; go run -mod=readonly main.go; popd"
alias hub_backend_tests="pushd $HUB_SOURCE; go test -cover -race -mod=readonly -count=1 ./...; popd"
alias hub_tests="hub_db_recreate_tests && hub_db_tests && hub_go_tests"
alias hub_frontend_build="pushd $HUB_SOURCE/web; yarn build; popd"
alias hub_frontend_dev="pushd $HUB_SOURCE/web; yarn start; popd"
alias hub_frontend_tests="pushd $HUB_SOURCE/web; yarn test; popd"
alias hub_frontend_lint_fix="pushd $HUB_SOURCE/web; yarn lint:fix; popd"
alias hub_trivy_server="trivy server --listen localhost:8081"
```
