alter table package add column package_category_source text
    check (package_category_source in ('publisher', 'predicted', 'skip'));

insert into package_category values (9, 'analytics', 'Analytics');
insert into package_category values (10, 'data-processing', 'Data processing');
insert into package_category values (11, 'web-applications', 'Web applications');

---- create above / drop below ----

update package set package_category_id = null where package_category_id in (9, 10, 11);
delete from package_category where package_category_id in (9, 10, 11);
alter table package drop column package_category_source;
