create table if not exists package_category (
    package_category_id integer primary key,
    name text not null check (name <> ''),
    display_name text not null check (display_name <> '')
);

insert into package_category values (1, 'ai-machine-learning', 'AI / Machine learning');
insert into package_category values (2, 'database', 'Database');
insert into package_category values (3, 'integration-delivery', 'Integration and delivery');
insert into package_category values (4, 'monitoring-logging', 'Monitoring and logging');
insert into package_category values (5, 'networking', 'Networking');
insert into package_category values (6, 'security', 'Security');
insert into package_category values (7, 'storage', 'Storage');
insert into package_category values (8, 'streaming-messaging', 'Streaming and messaging');

alter table package add column package_category_id integer;

---- create above / drop below ----

alter table package drop column package_category_id;
drop table if exists package_category;
