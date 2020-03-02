do $$ begin execute
'alter database ' || current_database() || ' set default_text_search_config = simple';
end; $$;

create extension if not exists "uuid-ossp";

create table if not exists organization (
    organization_id uuid primary key default uuid_generate_v4(),
    name text not null check (name <> '') unique,
    description text check (description <> '') unique,
    home_url text check (home_url <> ''),
    logo_url text check (logo_url <> ''),
    logo_image_id uuid,
    created_at timestamptz default current_timestamp not null
);

create table if not exists "user" (
    user_id uuid primary key default uuid_generate_v4(),
    alias text not null check (alias <> '') unique,
    first_name text check (first_name <> ''),
    last_name text check (last_name <> ''),
    email text not null check (email <> '') unique,
    password text check (password <> ''),
    created_at timestamptz default current_timestamp not null
);

create table if not exists user__organization (
    user_id uuid not null references "user" on delete cascade,
    organization_id uuid not null references organization on delete cascade,
    primary key (user_id, organization_id)
);

create table if not exists chart_repository (
    chart_repository_id uuid primary key default uuid_generate_v4(),
    name text not null check (name <> '') unique,
    display_name text,
    url text not null check (url <> '') unique,
    user_id uuid references "user" on delete restrict,
    organization_id uuid references organization on delete restrict,
    check (user_id is null or organization_id is null)
);

create table if not exists package_kind (
    package_kind_id integer primary key,
    name text not null check (name <> '')
);

insert into package_kind values (0, 'chart');

create function generate_package_tsdoc(
    p_name text,
    p_display_name text,
    p_description text,
    p_keywords text[]
) returns tsvector as $$
    select
        setweight(to_tsvector(p_name), 'A') ||
        setweight(to_tsvector(coalesce(p_display_name, '')), 'A') ||
        setweight(to_tsvector(coalesce(p_description, '')), 'B') ||
        setweight(array_to_tsvector(coalesce(p_keywords, '{}')), 'C');
$$ language sql immutable;

create table if not exists package (
    package_id uuid primary key default uuid_generate_v4(),
    name text not null check (name <> ''),
    display_name text check (display_name <> ''),
    description text check (description <> ''),
    home_url text check (home_url <> ''),
    logo_url text check (logo_url <> ''),
    logo_image_id uuid,
    keywords text[],
    latest_version text not null check (latest_version <> ''),
    created_at timestamptz default current_timestamp not null,
    updated_at timestamptz default current_timestamp not null,
    tsdoc tsvector generated always as (
        generate_package_tsdoc(name, display_name, description, keywords)
    ) stored,
    package_kind_id integer not null references package_kind on delete restrict,
    chart_repository_id uuid references chart_repository on delete restrict,
    check (package_kind_id <> 0 or chart_repository_id is not null),
    unique (chart_repository_id, name)
);

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
    maintainer_id uuid primary key default uuid_generate_v4(),
    name text not null,
    email text not null check (email <> '') unique
);

create table if not exists package__maintainer (
    package_id uuid not null references package on delete cascade,
    maintainer_id uuid not null references maintainer on delete cascade,
    primary key (package_id, maintainer_id)
);

create table if not exists image (
    image_id uuid primary key default uuid_generate_v4(),
    original_hash bytea not null check (original_hash <> '') unique
);

create table if not exists image_version (
    image_id uuid not null references image on delete cascade,
    version text not null check (version <> ''),
    data bytea not null,
    primary key (image_id, version)
);

{{ template "functions/semver_gte.sql" }}
{{ template "functions/get_chart_repositories.sql" }}
{{ template "functions/get_chart_repository_by_name.sql" }}
{{ template "functions/get_chart_repository_packages_digest.sql" }}
{{ template "functions/register_package.sql" }}
{{ template "functions/get_stats.sql" }}
{{ template "functions/search_packages.sql" }}
{{ template "functions/get_package.sql" }}
{{ template "functions/get_packages_updates.sql" }}
{{ template "functions/register_image.sql" }}
{{ template "functions/get_image.sql" }}

{{ if eq .loadSampleData "true" }}
{{ template "data/sample.sql" }}
{{ end }}

---- create above / drop below ----

drop function if exists get_image(p_image_id uuid, p_version text);
drop function if exists register_image(p_original_hash bytea, p_version text, p_data bytea);
drop function if exists get_packages_updates();
drop function if exists get_package(p_input json);
drop function if exists search_packages(p_query jsonb);
drop function if exists get_stats();
drop function if exists register_package(p_pkg jsonb);
drop function if exists get_chart_repository_packages_digest(p_chart_repository_id uuid);
drop function if exists get_chart_repository_by_name(p_name text);
drop function if exists get_chart_repositories();
drop function if exists semver_gte(p_v1 text, p_v2 text);
drop table if exists image_version;
drop table if exists image;
drop table if exists package__maintainer;
drop table if exists maintainer;
drop table if exists snapshot;
drop index if exists package_chart_repository_id_idx;
drop index if exists package_package_kind_id_idx;
drop index if exists package_tsdoc_idx;
drop table if exists package;
drop function if exists generate_package_tsdoc(
    p_name text,
    p_display_name text,
    p_description text,
    p_keywords text[]
);
drop table if exists package_kind;
drop table if exists chart_repository;
drop extension if exists "uuid-ossp";
