-- get_repository_subscriptors returns the users subscribed to the repository
-- provided for the given event kind. At the moment, the user owning a given
-- repository or all the users who belong to the organization which owns the
-- repository are considered to be subscribed to the repository, unless they
-- have opted out of notifications for that repository and event or they've
-- fully disabled the repositories notifications.
create or replace function get_repository_subscriptors(p_repository_id uuid, p_event_kind_id int)
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
    ) owners
    where user_id not in (
        select user_id
        from opt_out
        where repository_id = p_repository_id
        and event_kind_id = p_event_kind_id
        union
        select user_id
        from "user"
        where repositories_notifications_disabled = true
    );
$$ language sql;
