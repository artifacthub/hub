drop function if exists check_user_alias_availability(text);
delete from email_verification_code where current_timestamp - '1 day'::interval > created_at;

---- create above / drop below ----
