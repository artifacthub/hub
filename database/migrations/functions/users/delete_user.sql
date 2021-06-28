-- delete_user deletes the user provided if the passed code is valid, returning
-- the email of the deleted user.
create or replace function delete_user(p_user_id uuid, p_code text)
returns text as $$
declare
    v_email text;
begin
    -- Verify code
    perform from delete_user_code
    where delete_user_code_id = p_code and user_id = p_user_id
    and created_at + '15 minute'::interval > current_timestamp;
    if not found then
        raise 'invalid delete user code';
    end if;

    -- Get user's email
    select email from "user" into v_email where user_id = p_user_id;

    -- Delete organizations where the user to be deleted is the only member
    delete from organization where organization_id in (
        select organization_id
        from user__organization
        where organization_id in (
            select organization_id from user__organization where user_id = p_user_id
        )
        group by organization_id
        having count(*) = 1
    );

    -- Update stars count in packages starred by the user to be deleted
    update package p set stars = stars - 1 where package_id in (
        select package_id from user_starred_package where user_id = p_user_id
    );

    -- Delete user
    delete from "user" where user_id = p_user_id;

    return v_email;
end
$$ language plpgsql;
