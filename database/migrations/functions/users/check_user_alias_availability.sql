-- check_user_alias_availability checks if the provided alias is available.
create or replace function check_user_alias_availability(p_alias text)
returns setof uuid as $$
    select user_id
    from "user" u
    left join email_verification_code c using (user_id)
    where u.alias = p_alias
    and
        case when c.created_at is not null then
            current_timestamp - '1 day'::interval < c.created_at
        else
            true
        end;
$$ language sql;
