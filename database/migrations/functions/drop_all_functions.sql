drop function if exists search_packages(query jsonb);
drop function if exists get_package(p_package_id uuid);
drop function if exists get_package_version(p_package_id uuid, version text);
drop function if exists register_package(p_pkg jsonb);
drop function if exists get_chart_repository_by_name(name text);
drop function if exists get_chart_repositories();
