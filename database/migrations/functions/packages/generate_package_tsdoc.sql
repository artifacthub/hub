-- generate_package_tsdoc generates the package's document used to perform full
-- text searches.
create or replace function generate_package_tsdoc(
    p_name text,
    p_alternative_name text,
    p_display_name text,
    p_description text,
    p_keywords text[],
    p_repository text[],
    p_publisher text[]
) returns tsvector as $$
    select
        setweight(to_tsvector(p_name), 'A') ||
        setweight(to_tsvector(coalesce(p_alternative_name, '')), 'A') ||
        setweight(to_tsvector(coalesce(p_display_name, '')), 'B') ||
        setweight(to_tsvector(coalesce(p_description, '')), 'B') ||
        setweight(to_tsvector(array_to_string(coalesce(p_keywords, '{}'), ' ')), 'C') ||
        setweight(to_tsvector(array_to_string(coalesce(p_repository, '{}'), ' ')), 'B') ||
        setweight(to_tsvector(array_to_string(coalesce(p_publisher, '{}'), ' ')), 'B');
$$ language sql immutable;
