alter table "user" add column repositories_notifications_disabled boolean;
create index if not exists user_repositories_notifications_disabled_idx
    on "user" (user_id)
    where repositories_notifications_disabled = true;

---- create above / drop below ----

drop index if exists user_repositories_notifications_disabled_idx;
alter table "user" drop column repositories_notifications_disabled;
