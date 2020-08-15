-- get_package_subscriptors returns the users subscribed to the package
-- provided for the given event kind.
create or replace function get_package_subscriptors(p_package_id uuid, p_event_kind int)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'user_id', u.user_id
    )), '[]')
    from subscription s
    join "user" u using (user_id)
    where s.package_id = p_package_id
    and s.event_kind_id = p_event_kind;
$$ language sql;
