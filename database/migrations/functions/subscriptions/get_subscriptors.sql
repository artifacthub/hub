-- get_subscriptors returns the users subscribed to the package provided for
-- the given notification kind.
create or replace function get_subscriptors(p_package_id uuid, p_notification_kind int)
returns setof json as $$
    select coalesce(json_agg(json_build_object(
        'email', u.email
    )), '[]')
    from subscription s
    join "user" u using (user_id)
    where s.package_id = p_package_id
    and s.notification_kind_id = p_notification_kind;
$$ language sql;
