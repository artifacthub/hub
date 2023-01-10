insert into repository_kind values (15, 'Kyverno policies');

---- create above / drop below ----

delete from repository_kind where repository_kind_id = 15;
