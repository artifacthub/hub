create index subscription_package_id_idx on subscription (package_id);
create index webhook__package_package_id_idx on webhook__package (package_id);

---- create above / drop below ----

drop index subscription_package_id_idx;
drop index webhook__package_package_id_idx;
