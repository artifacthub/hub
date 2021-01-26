do $$ begin execute
'alter database ' || current_database() || ' set default_text_search_config = simple';
end; $$;

create extension if not exists pgcrypto;

create table if not exists organization (
    organization_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> '') unique,
    display_name text check (display_name <> ''),
    description text check (description <> ''),
    home_url text check (home_url <> ''),
    logo_image_id uuid,
    created_at timestamptz default current_timestamp not null,
    authorization_enabled boolean not null default false,
    predefined_policy text,
    custom_policy text,
    policy_data jsonb
);

create or replace function notify_authorization_policies_updates()
returns trigger as $$
begin
    perform pg_notify('authorization_policies_updated', '');
    return null;
end
$$ language plpgsql;

create trigger trigger_authorization_policies_updated
after update on organization
for each row
when (
    (old.authorization_enabled, old.predefined_policy, old.custom_policy, old.policy_data)
    is distinct from
    (new.authorization_enabled, new.predefined_policy, new.custom_policy, new.policy_data)
)
execute function notify_authorization_policies_updates();

create table if not exists "user" (
    user_id uuid primary key default gen_random_uuid(),
    alias text not null check (alias <> '') unique,
    first_name text check (first_name <> ''),
    last_name text check (last_name <> ''),
    email text not null check (email <> '') unique,
    email_verified boolean not null default false,
    password text check (password <> ''),
    profile_image_id uuid,
    created_at timestamptz default current_timestamp not null
);

create table if not exists user__organization (
    user_id uuid not null references "user" on delete cascade,
    organization_id uuid not null references organization on delete cascade,
    confirmed boolean not null default false,
    primary key (user_id, organization_id)
);

create table if not exists email_verification_code (
    email_verification_code_id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references "user" on delete cascade,
    created_at timestamptz default current_timestamp not null
);

create table if not exists session (
    session_id bytea primary key default gen_random_bytes(32),
    user_id uuid not null references "user" on delete cascade,
    ip inet,
    user_agent text,
    created_at timestamptz default current_timestamp not null
);

create table if not exists repository_kind (
    repository_kind_id integer primary key,
    name text not null check (name <> '')
);

insert into repository_kind values (0, 'Helm charts');
insert into repository_kind values (1, 'Falco rules');
insert into repository_kind values (2, 'OPA policies');
insert into repository_kind values (3, 'OLM operators');
insert into repository_kind values (4, 'Tinkerbell actions');
insert into repository_kind values (5, 'Krew kubectl plugins');
insert into repository_kind values (6, 'Helm plugins');
insert into repository_kind values (7, 'Tekton tasks');

create table if not exists repository (
    repository_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> '') unique,
    display_name text check (display_name <> ''),
    url text not null check (url <> ''),
    branch text check (branch <> ''),
    auth_user text check (auth_user <> ''),
    auth_pass text check (auth_pass <> ''),
    last_tracking_ts timestamptz,
    last_tracking_errors text,
    verified_publisher boolean not null default false,
    official boolean not null default false,
    disabled boolean not null default false,
    scanner_disabled boolean not null default false,
    digest text check (digest <> ''),
    repository_kind_id integer not null default 0 references repository_kind on delete restrict,
    user_id uuid references "user" on delete restrict,
    organization_id uuid references organization on delete cascade,
    check (user_id is not null or organization_id is not null)
);

create index repository_repository_kind_id_idx on repository (repository_kind_id);
create index repository_user_id_idx on repository (user_id);
create index repository_organization_id_idx on repository (organization_id);
create unique index repository_url_idx on repository (trim(trailing '/' from url));

create table if not exists package (
    package_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> ''),
    normalized_name text generated always as (replace(lower(name), ' ', '-')) stored,
    latest_version text not null check (latest_version <> ''),
    logo_url text check (logo_url <> ''),
    logo_image_id uuid,
    stars integer not null default 0,
    tsdoc tsvector,
    is_operator boolean,
    channels jsonb,
    default_channel text check (default_channel <> ''),
    repository_id uuid not null references repository on delete cascade,
    unique (repository_id, name)
);

create index package_tsdoc_idx on package using gin (tsdoc);
create index package_repository_id_idx on package (repository_id);
create index package_has_logo_image_id_idx on package (package_id, latest_version) where logo_image_id is not null;

create table if not exists snapshot (
    package_id uuid not null references package on delete cascade,
    version text not null check (version <> ''),
    display_name text check (display_name <> ''),
    description text check (description <> ''),
    keywords text[],
    home_url text check (home_url <> ''),
    app_version text check (app_version <> ''),
    digest text check (digest <> ''),
    readme text check (readme <> ''),
    install text check (install <> ''),
    links jsonb,
    crds jsonb,
    crds_examples jsonb,
    security_report jsonb,
    security_report_created_at timestamptz,
    security_report_summary jsonb,
    capabilities text,
    data jsonb,
    deprecated boolean,
    license text check (license <> ''),
    signed boolean,
    content_url text check (content_url <> ''),
    containers_images jsonb,
    provider text check (provider <> ''),
    values_schema jsonb,
    changes text[],
    contains_security_updates boolean,
    prerelease boolean,
    created_at timestamptz default current_timestamp not null,
    primary key (package_id, version),
    unique (package_id, digest)
);

create index snapshot_not_deprecated_with_readme_idx on snapshot (package_id, version) include (created_at)
where (deprecated is null or deprecated = false) and readme is not null;

create table if not exists maintainer (
    maintainer_id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null check (email <> '') unique
);

create table if not exists package__maintainer (
    package_id uuid not null references package on delete cascade,
    maintainer_id uuid not null references maintainer on delete cascade,
    primary key (package_id, maintainer_id)
);

create table if not exists image (
    image_id uuid primary key default gen_random_uuid(),
    original_hash bytea not null check (original_hash <> '') unique
);

create table if not exists image_version (
    image_id uuid not null references image on delete cascade,
    version text not null check (version <> ''),
    data bytea not null,
    primary key (image_id, version)
);

create table if not exists user_starred_package (
    user_id uuid not null references "user" on delete cascade,
    package_id uuid not null references package on delete cascade,
    primary key (user_id, package_id)
);

create table if not exists event_kind (
    event_kind_id integer primary key,
    name text not null check (name <> '')
);

insert into event_kind values (0, 'New package release');
insert into event_kind values (1, 'Security alert');
insert into event_kind values (2, 'Repository tracking errors');
insert into event_kind values (3, 'Repository ownership claim');

create table event (
    event_id uuid primary key default gen_random_uuid(),
    created_at timestamptz default current_timestamp not null,
    processed boolean not null default false,
    processed_at timestamptz,
    event_kind_id integer not null references event_kind on delete restrict,
    repository_id uuid references repository on delete cascade,
    package_id uuid references package on delete cascade,
    package_version text check (package_version <> ''),
    data jsonb
);

create index event_not_processed_idx on event (event_id) where processed = 'false';

create table if not exists subscription (
    user_id uuid not null references "user" on delete cascade,
    package_id uuid not null references package on delete cascade,
    event_kind_id integer not null references event_kind on delete restrict,
    primary key (user_id, package_id, event_kind_id)
);

create table if not exists webhook (
    webhook_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> ''),
    description text check (description <> ''),
    url text not null check (url <> ''),
    secret text check (secret <> ''),
    content_type text check (content_type <> ''),
    template text check (template <> ''),
    active boolean not null default true,
    created_at timestamptz default current_timestamp not null,
    updated_at timestamptz default current_timestamp not null,
    user_id uuid references "user" on delete cascade,
    organization_id uuid references organization on delete cascade,
    check (user_id is null or organization_id is null)
);

create index webhook_user_id_idx on webhook (user_id);
create index webhook_organization_id_idx on webhook (organization_id);

create table if not exists webhook__event_kind (
    webhook_id uuid not null references webhook on delete cascade,
    event_kind_id integer not null references event_kind on delete restrict,
    primary key (webhook_id, event_kind_id)
);

create table if not exists webhook__package (
    webhook_id uuid not null references webhook on delete cascade,
    package_id uuid not null references package on delete cascade,
    primary key (webhook_id, package_id)
);

create table notification (
    notification_id uuid primary key default gen_random_uuid(),
    created_at timestamptz default current_timestamp not null,
    processed boolean not null default false,
    processed_at timestamptz,
    error text check (error <> ''),
    event_id uuid not null references event on delete cascade,
    user_id uuid references "user" on delete cascade,
    webhook_id uuid references webhook on delete cascade,
    check (user_id is null or webhook_id is null),
    unique (event_id, user_id),
    unique (event_id, webhook_id)
);

create index notification_not_processed_idx on notification (notification_id) where processed = 'false';
create index notification_webhook_id_created_at_idx on notification (webhook_id, created_at);

create table if not exists api_key (
    api_key_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> ''),
    key bytea not null default gen_random_bytes(32),
    user_id uuid not null references "user" on delete cascade,
    created_at timestamptz default current_timestamp not null
);

create index api_key_user_id_idx on api_key (user_id);

create table if not exists opt_out (
    opt_out_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references "user" on delete cascade,
    repository_id uuid not null references repository on delete cascade,
    event_kind_id integer not null references event_kind on delete restrict,
    unique (user_id, repository_id, event_kind_id)
);

{{ if eq .loadSampleData "true" }}
{{ template "data/sample.sql" }}
{{ end }}
