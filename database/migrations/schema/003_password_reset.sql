create table if not exists password_reset_code (
    password_reset_code_id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references "user" on delete cascade,
    created_at timestamptz default current_timestamp not null
);

---- create above / drop below ----

drop table if exists password_reset_code;
