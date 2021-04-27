insert into repository_kind values (9, 'CoreDNS plugins');

---- create above / drop below ----

delete from repository_kind where repository_kind_id = 9;
