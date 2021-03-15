alter table snapshot rename column created_at to ts;
alter table repository add column created_at timestamptz default current_timestamp not null;
alter table package add column created_at timestamptz default current_timestamp not null;
alter table snapshot add column created_at timestamptz default current_timestamp not null;

---- create above / drop below ----

alter table repository drop column created_at;
alter table package drop column created_at;
alter table snapshot drop column created_at;
alter table snapshot rename column ts to created_at;
