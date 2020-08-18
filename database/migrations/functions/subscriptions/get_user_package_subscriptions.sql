-- get_user_package_subscriptions returns the subscriptions the provided user
-- has for a given package as a json array.
create or replace function get_user_package_subscriptions(p_user_id uuid, p_package_id uuid)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'event_kind', event_kind_id
    )), '[]')
    from (
        select *
        from subscription
        where user_id = p_user_id
        and package_id = p_package_id
        order by event_kind_id asc
    ) s;
$$ language sql;
