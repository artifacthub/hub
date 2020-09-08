-- get_all_repositories returns all available repositories as a json array.
create or replace function get_all_repositories()
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'repository_id', r.repository_id,
        'name', r.name,
        'display_name', r.display_name,
        'url', r.url,
        'kind', r.repository_kind_id,
        'verified_publisher', r.verified_publisher,
        'official', r.official,
        'user_alias', u.alias,
        'organization_name', o.name
    )), '[]')
    from repository r
    left join "user" u using (user_id)
    left join organization o using (organization_id);
$$ language sql;
