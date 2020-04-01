-- toggle_star stars on unstars a given package for the provided user.
create or replace function toggle_star(p_user_id uuid, p_package_id uuid)
returns void as $$
declare
    v_already_starred boolean;
begin
    select exists (
        select * from user_starred_package
        where user_id = p_user_id and package_id = p_package_id
    ) into v_already_starred;

    if not v_already_starred then
        insert into user_starred_package (user_id, package_id)
        values (p_user_id, p_package_id);

        update package set stars = stars + 1 where package_id = p_package_id;
    else
        delete from user_starred_package
        where user_id = p_user_id and package_id = p_package_id;

        update package set stars = stars - 1 where package_id = p_package_id;
    end if;
end
$$ language plpgsql;
