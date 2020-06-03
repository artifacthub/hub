-- Register demo user
insert into "user" (user_id, alias, email, email_verified, password)
values ('00000000-0000-0000-0000-000000000001', 'demo', 'demo@artifacthub.io', true, '$2a$10$FRAFMqDgJYgKEIrW8Y3Pqu7m5uFjtGxNAjlOtXA1iiFGGH7NycLIO');

-- Register Helm repositories
insert into chart_repository (name, url, user_id)
values ('stable','https://kubernetes-charts.storage.googleapis.com', '00000000-0000-0000-0000-000000000001');
insert into chart_repository (name, url, user_id)
values ('incubator','https://kubernetes-charts-incubator.storage.googleapis.com', '00000000-0000-0000-0000-000000000001');
