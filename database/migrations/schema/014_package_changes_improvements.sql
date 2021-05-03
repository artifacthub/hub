alter table snapshot add column changes_tmp jsonb;
update snapshot set changes_tmp = (select json_agg(json_build_object('description', description)) from unnest(changes) as description) where changes is not null;
alter table snapshot drop column changes;
alter table snapshot rename column changes_tmp to changes;

---- create above / drop below ----

alter table snapshot add column changes_tmp text[];
update snapshot set changes_tmp = (select array_agg(entry->>'description') from jsonb_array_elements(changes) as entry) where changes is not null;
alter table snapshot drop column changes;
alter table snapshot rename column changes_tmp to changes;
