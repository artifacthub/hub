drop function if exists get_package(p_package_id uuid);
drop function if exists get_package_version(p_package_id uuid, version text);
drop function if exists search_packages(query jsonb);
drop function if exists get_stats();
drop function if exists register_package(p_pkg jsonb);
drop function if exists get_chart_repository_packages_digest(p_chart_repository_id uuid);
drop function if exists get_chart_repository_by_name(name text);
drop function if exists get_chart_repositories();
drop function if exists semver_gte(v1 text, v2 text);
