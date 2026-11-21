CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT repositories_owner_not_empty
    CHECK (length(trim(owner)) > 0),

  CONSTRAINT repositories_name_not_empty
    CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX repositories_owner_name_unique
  ON repositories (lower(owner), lower(name));

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id),
  github_id BIGINT NOT NULL UNIQUE,
  number INTEGER NOT NULL CHECK (number > 0),
  title TEXT NOT NULL,
  body TEXT,
  state TEXT NOT NULL CHECK (state IN ('open', 'closed')),
  html_url TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT issues_repository_number_unique
    UNIQUE (repository_id, number)
);