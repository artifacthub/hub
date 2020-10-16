-- get_user_opt_out_entries returns all the opt-out entries for the provided
-- user as a json array.
create or replace function get_user_opt_out_entries(p_user_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'opt_out_id', opt_out_id,
        'repository', (select get_repository_summary(repository_id)),
        'event_kind', event_kind_id
    )), '[]')
    from (
        select
            oo.opt_out_id,
            oo.event_kind_id,
            r.repository_id,
            r.repository_kind_id,
            r.name as repository_name,
            r.display_name as repository_display_name,
            u.alias as user_alias,
            o.name as organization_name,
            o.display_name as organization_display_name
        from opt_out oo
        join repository r using (repository_id)
        left join "user" u on u.user_id = r.user_id
        left join organization o using (organization_id)
        where oo.user_id = p_user_id
        order by oo.opt_out_id asc
    ) ooe;
$$ language sql;
