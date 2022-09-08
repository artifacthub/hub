-- Register demo user
insert into "user" (user_id, alias, email, email_verified, password)
values ('00000000-0000-0000-0000-000000000001', 'demo', 'demo@artifacthub.io', true, '$2a$10$FRAFMqDgJYgKEIrW8Y3Pqu7m5uFjtGxNAjlOtXA1iiFGGH7NycLIO');

-- Register some repositories
insert into repository (name, url, repository_kind_id, user_id)
values ('artifact-hub','https://artifacthub.github.io/helm-charts/', 0, '00000000-0000-0000-0000-000000000001');
