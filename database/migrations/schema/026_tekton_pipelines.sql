insert into repository_kind values (11, 'Tekton pipelines');

---- create above / drop below ----

delete from repository_kind where repository_kind_id = 11;
