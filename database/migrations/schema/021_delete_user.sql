alter table repository drop constraint repository_user_id_fkey, add constraint repository_user_id_fkey foreign key (user_id) references "user" on delete cascade;
create table if not exists delete_user_code (
    delete_user_code_id text primary key,
    user_id uuid not null unique references "user" on delete cascade,
    created_at timestamptz default current_timestamp not null
);

---- create above / drop below ----

alter table repository drop constraint repository_user_id_fkey, add constraint repository_user_id_fkey foreign key (user_id) references "user" on delete restrict;
drop table if exists delete_user_code;
