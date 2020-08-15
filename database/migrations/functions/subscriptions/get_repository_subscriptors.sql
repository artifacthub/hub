-- get_repository_subscriptors returns the users subscribed to the repository
-- provided for the given event kind. At the moment, the user owning a given
-- repository or all the users who belong to the organization which owns the
-- repository are considered to be subscribed to the repository.
create or replace function get_repository_subscriptors(p_repository_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'user_id', user_id
    )), '[]')
    from (
        select r.user_id
        from repository r
        where repository_id = p_repository_id
        and r.user_id is not null
        union
        select uo.user_id
        from repository r
        join organization o using (organization_id)
        join user__organization uo using (organization_id)
        where repository_id = p_repository_id
        and uo.confirmed = true
        order by user_id asc
    ) owners;
$$ language sql;
