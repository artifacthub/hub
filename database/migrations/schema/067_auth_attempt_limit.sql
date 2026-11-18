create table if not exists auth_attempt_limit (
    user_id uuid not null references "user" on delete cascade,
    kind text not null check (kind in (
        'login_password',
        'login_tfa',
        'password_update',
        'tfa_disable'
    )),
    tat timestamptz not null,
    primary key (user_id, kind)
);

-- Password reset codes issued under the previous 15 minutes lifetime must not
-- become valid again under the new 4 hours one
delete from password_reset_code where created_at <= current_timestamp - '15 minutes'::interval;

---- create above / drop below ----

drop table if exists auth_attempt_limit;
