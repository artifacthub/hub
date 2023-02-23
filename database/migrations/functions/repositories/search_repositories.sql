-- search_repositories searches repositories in the database that match the
-- criteria in the query provided.
create or replace function search_repositories(p_input jsonb)
returns table(data json, total_count bigint) as $$
declare
    v_name text := (p_input->>'name');
    v_url text := nullif(p_input->>'url', '');
    v_kinds int[];
    v_users text[];
    v_orgs text[];
    v_include_credentials boolean := (p_input->>'include_credentials')::boolean;
begin
    -- Prepare filters for later use
    select array_agg(e::int) into v_kinds
    from jsonb_array_elements_text(p_input->'kinds') e;
    select array_agg(e::text) into v_users
    from jsonb_array_elements_text(p_input->'users') e;
    select array_agg(e::text) into v_orgs
    from jsonb_array_elements_text(p_input->'orgs') e;

    return query
    with filtered_repositories as (
        select
            r.repository_id,
            r.name,
            r.display_name,
            r.url,
            r.branch,
            r.auth_user,
            r.auth_pass,
            r.repository_kind_id,
            r.verified_publisher,
            r.official,
            r.cncf,
            r.disabled,
            r.scanner_disabled,
            r.digest,
            r.last_scanning_ts,
            r.last_scanning_errors,
            r.last_tracking_ts,
            r.last_tracking_errors,
            r.data as repository_data,
            u.alias as user_alias,
            o.name as organization_name,
            o.display_name as organization_display_name
        from repository r
        left join "user" u using (user_id)
        left join organization o using (organization_id)
        where
            case when v_name is not null then r.name ~* v_name else true end
        and
            case when v_url is not null then trim(trailing '/' from r.url) = trim(trailing '/' from v_url) else true end
        and
            case when cardinality(v_kinds) > 0
            then r.repository_kind_id = any(v_kinds) else true end
        and
            case
                when cardinality(v_orgs) > 0 and cardinality(v_users) > 0 then
                    (o.name = any(v_orgs) or u.alias = any(v_users))
                when cardinality(v_orgs) > 0 then
                    o.name = any(v_orgs)
                when cardinality(v_users) > 0 then
                    u.alias = any(v_users)
                else true
            end
    )
    select
        coalesce(json_agg(json_strip_nulls(json_build_object(
            'repository_id', repository_id,
            'name', name,
            'display_name', display_name,
            'url', url,
            'branch', branch,
            'private', (case when auth_user is not null or auth_pass is not null then true else null end),
            'auth_user', (case when v_include_credentials then auth_user else null end),
            'auth_pass', (case when v_include_credentials then auth_pass else null end),
            'kind', repository_kind_id,
            'verified_publisher', verified_publisher,
            'official', official,
            'cncf', cncf,
            'disabled', disabled,
            'scanner_disabled', scanner_disabled,
            'digest', digest,
            'last_scanning_ts', floor(extract(epoch from last_scanning_ts)),
            'last_scanning_errors', last_scanning_errors,
            'last_tracking_ts', floor(extract(epoch from last_tracking_ts)),
            'last_tracking_errors', last_tracking_errors,
            'data', repository_data,
            'user_alias', user_alias,
            'organization_name', organization_name,
            'organization_display_name', organization_display_name
        ))), '[]'),
        (select count(*) from filtered_repositories)
    from (
        select *
        from filtered_repositories
        order by name asc
        limit (p_input->>'limit')::int
        offset (p_input->>'offset')::int
    ) rs;
end
$$ language plpgsql;
