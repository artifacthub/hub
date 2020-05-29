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
    created_at timestamptz default current_timestamp not null
);

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

create table if not exists chart_repository (
    chart_repository_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> '') unique,
    display_name text check (display_name <> ''),
    url text not null check (url <> '') unique,
    last_tracking_ts timestamptz,
    last_tracking_errors text,
    user_id uuid references "user" on delete restrict,
    organization_id uuid references organization on delete restrict,
    check (user_id is null or organization_id is null)
);

create table if not exists package_kind (
    package_kind_id integer primary key,
    name text not null check (name <> '')
);

insert into package_kind values (0, 'Helm charts');
insert into package_kind values (1, 'Falco rules');
insert into package_kind values (2, 'OPA policies');

create table if not exists package (
    package_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> ''),
    normalized_name text generated always as (replace(lower(name), ' ', '-')) stored,
    latest_version text not null check (latest_version <> ''),
    logo_url text check (logo_url <> ''),
    logo_image_id uuid,
    stars integer not null default 0,
    tsdoc tsvector,
    created_at timestamptz default current_timestamp not null,
    updated_at timestamptz default current_timestamp not null,
    package_kind_id integer not null references package_kind on delete restrict,
    user_id uuid references "user" on delete restrict,
    organization_id uuid references organization on delete restrict,
    chart_repository_id uuid references chart_repository on delete cascade,
    check (user_id is null or organization_id is null),
    check (user_id is null or chart_repository_id is null),
    check (organization_id is null or chart_repository_id is null),
    check (package_kind_id <> 0 or chart_repository_id is not null)
);

create index package_stars_idx on package (stars);
create index package_tsdoc_idx on package using gin (tsdoc);
create index package_created_at_idx on package (created_at);
create index package_updated_at_idx on package (updated_at);
create index package_package_kind_id_idx on package (package_kind_id);
create index package_user_id_idx on package (user_id);
create index package_organization_id_idx on package (organization_id);
create index package_chart_repository_id_idx on package (chart_repository_id);
create unique index package_unique_name_idx on package (
    coalesce(chart_repository_id, '99999999-9999-9999-9999-999999999999'),
    package_kind_id,
    name
);

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
    links jsonb,
    data jsonb,
    deprecated boolean,
    license text check (license <> ''),
    content_url text check (content_url <> ''),
    created_at timestamptz default current_timestamp not null,
    updated_at timestamptz default current_timestamp not null,
    primary key (package_id, version),
    unique (package_id, digest)
);

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

create table event (
    event_id uuid primary key default gen_random_uuid(),
    created_at timestamptz default current_timestamp not null,
    processed boolean not null default false,
    processed_at timestamptz,
    package_version text not null check (package_version <> ''),
    package_id uuid not null references package on delete cascade,
    event_kind_id integer not null references event_kind on delete restrict,
    unique (package_id, package_version, event_kind_id)
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
    event_id uuid not null references event on delete restrict,
    user_id uuid references "user" on delete cascade,
    webhook_id uuid references webhook on delete cascade,
    check (user_id is null or webhook_id is null),
    unique (event_id, user_id),
    unique (event_id, webhook_id)
);

create index notification_not_processed_idx on notification (notification_id) where processed = 'false';

{{ if eq .loadSampleData "true" }}
{{ template "data/sample.sql" }}
{{ end }}
