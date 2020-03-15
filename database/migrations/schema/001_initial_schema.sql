do $$ begin execute
'alter database ' || current_database() || ' set default_text_search_config = simple';
end; $$;

create extension if not exists pgcrypto;

create table if not exists organization (
    organization_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> '') unique,
    description text check (description <> '') unique,
    home_url text check (home_url <> ''),
    logo_url text check (logo_url <> ''),
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
    created_at timestamptz default current_timestamp not null
);

create table if not exists user__organization (
    user_id uuid not null references "user" on delete cascade,
    organization_id uuid not null references organization on delete cascade,
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
    display_name text,
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

insert into package_kind values (0, 'chart');

create or replace function generate_package_tsdoc(
    p_name text,
    p_display_name text,
    p_description text,
    p_keywords text[]
) returns tsvector as $$
    select
        setweight(to_tsvector(p_name), 'A') ||
        setweight(to_tsvector(coalesce(p_display_name, '')), 'A') ||
        setweight(to_tsvector(coalesce(p_description, '')), 'B') ||
        setweight(to_tsvector(array_to_string(coalesce(p_keywords, '{}'), ' ')), 'C');
$$ language sql immutable;

create table if not exists package (
    package_id uuid primary key default gen_random_uuid(),
    name text not null check (name <> ''),
    display_name text check (display_name <> ''),
    description text check (description <> ''),
    home_url text check (home_url <> ''),
    logo_url text check (logo_url <> ''),
    logo_image_id uuid,
    keywords text[],
    deprecated boolean,
    latest_version text not null check (latest_version <> ''),
    created_at timestamptz default current_timestamp not null,
    updated_at timestamptz default current_timestamp not null,
    tsdoc tsvector generated always as (
        generate_package_tsdoc(name, display_name, description, keywords)
    ) stored,
    package_kind_id integer not null references package_kind on delete restrict,
    chart_repository_id uuid references chart_repository on delete cascade,
    check (package_kind_id <> 0 or chart_repository_id is not null),
    unique (chart_repository_id, name)
);

create index package_deprecated_idx on package (deprecated);
create index package_tsdoc_idx on package using gin (tsdoc);
create index package_package_kind_id_idx on package (package_kind_id);
create index package_chart_repository_id_idx on package (chart_repository_id);
create index package_created_at_idx on package (created_at);
create index package_updated_at_idx on package (updated_at);

create table if not exists snapshot (
    package_id uuid not null references package on delete cascade,
    version text not null check (version <> ''),
    app_version text check (app_version <> ''),
    digest text not null check (digest <> ''),
    readme text check (readme <> ''),
    links jsonb,
    primary key (package_id, version)
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

{{ if eq .loadSampleData "true" }}
{{ template "data/sample.sql" }}
{{ end }}
