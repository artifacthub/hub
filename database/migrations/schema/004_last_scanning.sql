alter table repository add column last_scanning_ts timestamptz;
alter table repository add column last_scanning_errors text;
insert into event_kind values (4, 'Repository scanning errors');

---- create above / drop below ----

alter table repository drop column last_scanning_ts;
alter table repository drop column last_scanning_errors;
delete from event_kind where event_kind_id = 4;
