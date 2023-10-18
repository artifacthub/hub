insert into repository_kind values (20, 'KCL packages');

---- create above / drop below ----

delete from repository_kind where repository_kind_id = 20;
