-- Register demo user
insert into "user" (user_id, alias, email, email_verified, password)
values ('00000000-0000-0000-0000-000000000001', 'demo', 'demo@artifacthub.io', true, '$2a$10$FRAFMqDgJYgKEIrW8Y3Pqu7m5uFjtGxNAjlOtXA1iiFGGH7NycLIO');

-- Register some repositories
insert into repository (name, url, repository_kind_id, user_id)
values ('security-hub','https://github.com/falcosecurity/cloud-native-security-hub/resources/falco', 1, '00000000-0000-0000-0000-000000000001');
insert into repository (name, url, repository_kind_id, user_id)
values ('stable','https://kubernetes-charts.storage.googleapis.com', 0, '00000000-0000-0000-0000-000000000001');
insert into repository (name, url, repository_kind_id, user_id)
values ('incubator','https://kubernetes-charts-incubator.storage.googleapis.com', 0, '00000000-0000-0000-0000-000000000001');
insert into repository (name, url, repository_kind_id, user_id)
values ('community-operators','https://github.com/operator-framework/community-operators/upstream-community-operators', 3, '00000000-0000-0000-0000-000000000001');
