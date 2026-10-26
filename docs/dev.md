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

The `tracker` is another backend cmd in charge of indexing registered repositories metadata. On production deployments, it is usually run periodically using a `cronjob` on Kubernetes. Locally while developing, you can just run it as often as you need as any other CLI tool. The tracker requires the [OPM cli tool](https://github.com/operator-framework/operator-registry/releases) to be installed and available in your PATH, so please make sure it's available before proceeding.

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

## Package category classifier

When a package doesn't provide a category, the `tracker` tries to predict one
from its name, keywords and description. The prediction is done by a small
model written in Go, and the package is left without a category when the model
isn't confident enough. The categories supported are defined in
[categories.yaml](https://github.com/artifacthub/hub/blob/master/internal/category/catalog/categories.yaml).

The model is trained offline by the maintainers from a dataset of packages
labelled by LLMs and reviewed by them, plus the categories provided by
publishers. The packed dataset and publisher rows, and the baseline model
trained from them, live in
[internal/category/data](https://github.com/artifacthub/hub/tree/master/internal/category/data).
Only the baseline model is embedded in the `tracker`, which always uses it (it
logs `using embedded package category model` on startup, along with the model's
algorithm, training set digest and dataset digest). The `tracker` never trains
or replaces the model: a new model is shipped by committing a new baseline
model and releasing it.

On full runs (no `repositoriesNames` or `repositoriesKinds` set), before
tracking the repositories, the `tracker` predicts again the category of the
packages whose category was predicted (including those left without one), and
updates only those whose category changes. So the first full run of a release
with a new baseline model applies it to all of them. Categories provided by
publishers are never changed.

The `tracker` records where the category of each package comes from (provided
by the publisher, predicted, or prediction skipped by the publisher) when it
registers its latest version. Packages registered before this classifier was
introduced don't have that information: they keep the category they had (which
may have been predicted by the previous classifier), aren't predicted again,
and aren't exported as publisher rows for training until they publish a new
version. To move them over at once, run the `tracker` once with
`tracker.bypassDigestCheck` set to `true`. This processes every version of
every package again (downloading charts and other artifacts), so it's slow and
puts some load on the upstream registries. It can be split up by setting
`tracker.repositoriesKinds`. Registering versions already registered doesn't
generate new release events.

The model is trained using the `category` development tool (`cmd/category`).
This tool is not released, and it never connects to the database. The steps
are: export the packages, label them with the Copilot CLI, review the labels,
export the categories provided by publishers, and train and commit the new
baseline model. The commands below are run from the root of the repository,
and all the files they use (which may contain packages' READMEs) are kept
outside of it, in `~/tmp/category` in these examples.

### Exporting the packages

The packages to label are exported with the
`get_packages_for_category_labelling` database function, which returns one
JSON object per package, built from its latest version (packages whose latest
version is deprecated are excluded). The export is written by `psql` on the
machine where it runs, so no access to the database host is needed:

```sh
mkdir -p ~/tmp/category
PGCLIENTENCODING=UTF8 psql -X -At -v ON_ERROR_STOP=1 -v FETCH_COUNT=1000 \
  -h <host> -U <user> -d hub \
  -c 'select get_packages_for_category_labelling()' \
  > ~/tmp/category/packages.jsonl
```

`-X` ignores your `~/.psqlrc`, so that nothing else is written to the file,
`PGCLIENTENCODING` makes sure the output is UTF-8 whatever your locale is, and
`FETCH_COUNT` streams the rows instead of loading them all in memory first.
Please do not use `\copy` instead: its text format escapes backslashes again,
which breaks the JSON objects. The number of lines of the file should match the
number of packages exported:

```sh
psql -X -At -h <host> -U <user> -d hub \
  -c 'select count(*) from get_packages_for_category_labelling()'
wc -l < ~/tmp/category/packages.jsonl
```

Use a read replica if one is available. If the release that adds this function
hasn't been deployed yet, it can be loaded on its own beforehand (it only reads
existing tables). Please load it **as the database user the `db-migrator` uses**
(the chart's `db.user`): when the release is deployed, the functions migration
replaces it, and that only works for the function's owner. Alternatively, drop
it (`drop function get_packages_for_category_labelling();`) after the export.
Once loaded in production, its signature and return type must not change.

```sh
cd $HUB_SOURCE/database/migrations/functions/packages
psql -h <host> -U <db-migrator-user> -d hub -v ON_ERROR_STOP=1 \
  -f get_packages_for_category_labelling.sql
```

### Setting up the Copilot CLI

Packages are labelled using the GitHub Copilot CLI (`copilot`), which must be
installed and available in your PATH. It's run non-interactively, with no
tools, and authenticated **with your Copilot subscription** (this is the only
authentication mode supported).

The tool uses a dedicated *agent home*, separate from your normal Copilot CLI
configuration, that holds only the GitHub token used. It defaults to
`$XDG_STATE_HOME/artifacthub-category/copilot`, or
`~/.local/state/artifacthub-category/copilot` when `XDG_STATE_HOME` is not
set, and can be changed with `--agent-home`. Every call to the CLI starts
clean: it runs in an empty temporary working directory, with a temporary
`HOME`, its own empty `COPILOT_HOME` and only an allowlisted set of environment
variables, so your own settings, instructions (such as `AGENTS.md` files),
skills, agents, plugins, hooks and MCP servers are never used. The tool refuses
to start if `COPILOT_ALLOW_ALL` or any `COPILOT_PROVIDER_*` variable is set.

Create a
[fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
with only the *Copilot Requests* permission and save it in
`<agent-home>/github-token`, with mode `0600`. Requests count against your
Copilot plan. Classic (`ghp_`) tokens are rejected, and `copilot login` is not
supported (it stores the credentials in the OS keyring). The commands below
assume `XDG_STATE_HOME` is not set; if it is, replace `~/.local/state` with
`$XDG_STATE_HOME`.

```sh
mkdir -p -m 700 ~/.local/state/artifacthub-category/copilot
(umask 077 && cat > ~/.local/state/artifacthub-category/copilot/github-token)
```

Paste the token and press `Ctrl-D`.

### Labelling the packages

The LLM gets the
[labelling guidelines](https://github.com/artifacthub/hub/blob/master/internal/category/labeler/guidelines.md),
the categories, and each package's name, keywords, description and a README
excerpt. Packages with the same name, keywords and description are labelled
once. Please refine the guidelines when the labels show fuzzy boundaries
between categories.

When the guidelines change, start by labelling the same sample of packages
with two different models, and compare their labels with the `agreement`
command. It prints the overall agreement, Cohen's kappa, a confusion matrix
and the most frequent disagreements. Refine the guidelines and repeat as
needed (use new output files after changing them).

```sh
go run ./cmd/category label --model claude-sonnet-5.5 \
  --input ~/tmp/category/packages.jsonl \
  --output ~/tmp/category/sample-a.jsonl --sample 300
go run ./cmd/category label --model <another model> \
  --input ~/tmp/category/packages.jsonl \
  --output ~/tmp/category/sample-b.jsonl --sample 300
go run ./cmd/category agreement \
  --a ~/tmp/category/sample-a.jsonl \
  --b ~/tmp/category/sample-b.jsonl
```

Then label all the packages:

```sh
go run ./cmd/category label --model claude-sonnet-5.5 \
  --input ~/tmp/category/packages.jsonl \
  --output ~/tmp/category/dataset.jsonl
```

Other options available are `--effort`, `--batch-size` (25), `--concurrency`
(1), `--timeout` (2m), `--readme-max-bytes` (3000) and `--no-readme`. Please
see `go run ./cmd/category label --help` for more details. Each batch usually
takes a few seconds, but the Copilot CLI sometimes stalls waiting for a reply
that never arrives: those calls are killed when the timeout expires and
retried. As a reference, labelling the 19,015 distinct packages of the October
2026 export with Claude Sonnet 5.5 costs about 6,000 AI credits.

The labels are appended to the output after each batch, so the labelling can
be resumed by running the same command again: packages already labelled are
skipped. Labelling can't be resumed into an output labelled with a different
categories file, so please use a new output after changing it. When the
subscription's usage limit is reached, or the login is no longer valid, the
command stops and tells you what to do. Packages whose replies weren't valid
are written to a failures file next to the output (`dataset.failures.jsonl`),
and they're retried on the next run unless `--skip-failures` is used.

### Reviewing the labels

The review is done on the plain `dataset.jsonl` file. Please review:

- Every row flagged as `suspicious` or `needs_review`.
- A random sample of every category, including `none`.

```sh
jq -c 'select(.suspicious or .needs_review)' ~/tmp/category/dataset.jsonl
jq -c 'select(.label == "database")' ~/tmp/category/dataset.jsonl | shuf -n 25
```

To fix a row, edit its `label` (a category name or `none`), and set
`suspicious` and `needs_review` to `false` once it's been reviewed. Rows that
are `suspicious`, need review, or have a `low` confidence are not used for
training, so set `confidence` to `high` on low confidence rows whose label you
confirm. Rows can also be removed. Please don't edit `content_key`, `name`,
`keywords` or `description`: rows whose content key doesn't match them are
rejected.

### Exporting the categories provided by publishers

The categories provided by publishers are exported with the
`get_category_training_data` database function, which returns one JSON object
per package whose category was provided by its publisher, built from its latest
version (packages whose latest version is deprecated are excluded):

```sh
PGCLIENTENCODING=UTF8 psql -X -At -v ON_ERROR_STOP=1 -v FETCH_COUNT=1000 \
  -h <host> -U <user> -d hub \
  -c 'select get_category_training_data()' \
  > ~/tmp/category/publisher.jsonl
psql -X -At -h <host> -U <user> -d hub \
  -c 'select count(*) from get_category_training_data()'
wc -l < ~/tmp/category/publisher.jsonl
```

The notes about the `psql` flags, the line count check and using a read
replica of the [packages export](#exporting-the-packages) apply here as well.
Unlike `get_packages_for_category_labelling`, this function can't be loaded
before the release that adds it is deployed: it reads the source of the
packages' categories, which is added by that release.

Only packages registered by the `tracker` of that release (or processed again
with `tracker.bypassDigestCheck`, as described above) have the source of their
category recorded, so the number of publisher rows grows over time as packages
publish new versions.

### Training and committing the model

Train the baseline model from the reviewed dataset and the publisher rows:

```sh
go run ./cmd/category train --dataset ~/tmp/category/dataset.jsonl \
  --publisher-rows ~/tmp/category/publisher.jsonl
go test ./internal/category/... ./cmd/category/...
```

This writes `dataset.jsonl.gz`, `publisher.jsonl.gz` and `baseline.json` to
`internal/category/data` (nothing is written when training fails). The dataset
and the publisher rows are packed next to the model so that it can be
reproduced from the committed data (bit for bit only on the same CPU
architecture, as the compiler may fuse floating point operations differently
on each one). When packages with the same name, keywords
and description have different labels, the publisher rows take precedence over
the LLM labels. Without `--publisher-rows`, no publisher rows are used and an
empty `publisher.jsonl.gz` is written.

The command also prints a Markdown report with the digests and number of rows
of the dataset and the publisher rows, the model's evaluation metrics
(including metrics restricted to the publisher rows, once there are at least
200 of them) and a summary of the label changes compared with the previous
dataset. The report also warns about rows labelled with a categories file or
labelling guidelines different from the current ones, and lists the categories
of the publisher rows that aren't in the catalog (those rows are skipped).
Commit the three files and include the report in the pull request description.
They must never be edited by hand. The tests check, among other things, that
the files are packed exactly as `train` writes them, that the baseline model
matches the embedded dataset and the categories, that its training set is
reproduced from the embedded dataset and publisher rows, that retraining on
them gives a model with similar metrics, and that its cross-fitted precision
and coverage are above the minimums set in `internal/category/data_test.go`.

To print the metrics of a model trained on a dataset without writing anything,
use `go run ./cmd/category evaluate --dataset <file> --publisher-rows <file>`
(as with `train`, no publisher rows are used without `--publisher-rows`).
Without `--dataset`, the embedded dataset and publisher rows are used, so the
baseline model's metrics are reproduced; `--publisher-rows` replaces the
embedded publisher rows.

### Tested Copilot CLI version

The arguments passed to the Copilot CLI are built by the tool and pinned by
tests, and they depend on the CLI's version. The runner was verified against
the version below. When a new version is used, please complete the manual
verification below again and update this table.

| CLI | Version | Manual verification |
| --- | --- | --- |
| Copilot CLI | 1.0.104 | Done (except the usage limit error sample) |

### Residual prompt injection risk

The packages' content is untrusted. Nothing in the agent's replies is ever
executed or used as a path (only the labels are read), the agent can't use
tools, and the guidelines tell it to label each package using only its own
fields and to flag injection attempts as `suspicious`. When a package in a
batch is flagged, the other packages are labelled again without it, and those
whose label changes are marked as `needs_review`.

However, all the packages in a batch share the same prompt, so an injection
attempt the LLM doesn't flag can still affect the labels of the other packages
in its batch. Small batches and the review of a random sample of every category
limit that risk, but don't remove it.

### Manual verification of the Copilot CLI

No model call is part of CI. The following checks must be completed by hand
before relying on the runner, and again when a new CLI version is used. Their
results are recorded in the
[tested Copilot CLI version](#tested-copilot-cli-version) table. The error
samples captured are kept in `internal/category/labeler/testdata/copilot`, and
they're used by the `ClassifyError` tests.

- [x] **Subscription auth**: `COPILOT_GITHUB_TOKEN` with a fine-grained
  *Copilot Requests* token, an empty `COPILOT_HOME`, a temporary `HOME` and the
  allowlisted environment authenticates with no first-run or trust prompts,
  and the usage is charged to the Copilot plan (the session's usage records
  report the `copilot` provider and the AI credits used).
- [x] **No tools**: the tool filter that matches no tool
  (`--available-tools artifacthub-no-tools`) exposes no tools: no tool
  definitions are sent to the model, and no tool is called even when the
  prompt asks for it. An empty filter (`--available-tools ""`) is ignored, and
  every tool is exposed.
- [x] **Non-interactive**: it runs without `--allow-all-tools`, and a
  stdin-only prompt honours `-s` (only the reply is written to stdout). The
  reply is wrapped at 100 columns, even when stdout is not a terminal.
- [x] **Clean start**: none of the user's instructions, skills, agents or
  plugins (`~/.copilot`, `~/.agents`) are loaded (check the session's events in
  `COPILOT_HOME/session-state`).
- [x] **Exit codes**: 0 on success, and 1 when the token is missing or
  invalid, or the network fails.
- [x] **Processes**: nothing is left running after the CLI exits
  (`ps -eo pid,pgid,sid,args`).
- [ ] **Error samples**: capture how a missing token, an invalid token, a
  network failure and a usage limit show up (exit code and stderr). All but
  the usage limit have been captured.

### Adding a category

1. Add the entry to
   [categories.yaml](https://github.com/artifacthub/hub/blob/master/internal/category/catalog/categories.yaml)
   with the next unused ID. IDs are never reused.
2. Add a section to the
   [labelling guidelines](https://github.com/artifacthub/hub/blob/master/internal/category/labeler/guidelines.md)
   with a definition, what goes in and what stays out, and update the
   tie-breaking rules.
3. Add a database migration that inserts the `package_category` row, and update
   the pgTAP `database/tests/schema/schema.sql` tests.
4. Update the category enums in the OpenAPI spec (`docs/api/openapi.yaml`) and
   the categories lists in the annotations docs. Tests catch a missing OpenAPI
   entry.
5. Relabel **everything**: export the packages, run the agreement check on a
   sample, run the full labelling, then review the labels. A new category can
   take packages from any existing category.
6. Export the categories provided by publishers, train the baseline model and
   commit the dataset, the publisher rows and the model.
7. Deploy. The new release embeds the new baseline model, and its first full
   `tracker` run predicts again the category of every package whose category
   was predicted (packages registered before this classifier was introduced
   aren't included, please see the
   [package category classifier](#package-category-classifier) section above).

Renaming or splitting an existing category isn't supported: its ID and name are
part of the public annotations contract.

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
alias hub_tracker="pushd $HUB_SOURCE/cmd/tracker; go run -mod=readonly .; popd"
alias hub_scanner="pushd $HUB_SOURCE/cmd/scanner; go run -mod=readonly .; popd"
alias hub_backend_tests="pushd $HUB_SOURCE; go test -cover -race -mod=readonly -count=1 ./...; popd"
alias hub_tests="hub_db_recreate_tests && hub_db_tests && hub_go_tests"
alias hub_frontend_build="pushd $HUB_SOURCE/web; yarn build; popd"
alias hub_frontend_dev="pushd $HUB_SOURCE/web; yarn start; popd"
alias hub_frontend_tests="pushd $HUB_SOURCE/web; yarn test; popd"
alias hub_frontend_lint_fix="pushd $HUB_SOURCE/web; yarn lint:fix; popd"
alias hub_trivy_server="trivy server --listen localhost:8081"
```
