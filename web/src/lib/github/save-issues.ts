import "server-only";

import { getDatabasePool } from "@/lib/db";

type ImportedIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
};

type RepositoryReference = {
  owner: string;
  repository: string;
};

export async function saveRepositoryIssues(
  reference: RepositoryReference,
  issues: ImportedIssue[],
) {
  const client = await getDatabasePool().connect();

  try {
    await client.query("BEGIN");

    const repositoryResult = await client.query<{ id: string }>(
      `
        INSERT INTO repositories (owner, name)
        VALUES ($1, $2)
        ON CONFLICT (lower(owner), lower(name))
        DO UPDATE SET
          owner = EXCLUDED.owner,
          name = EXCLUDED.name
        RETURNING id
      `,
      [reference.owner, reference.repository],
    );

    const repositoryId = repositoryResult.rows[0]?.id;

    if (!repositoryId) {
      throw new Error("The repository could not be saved.");
    }

    for (const issue of issues) {
      await client.query(
        `
          INSERT INTO issues (
            repository_id,
            github_id,
            number,
            title,
            body,
            state,
            html_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (github_id)
          DO UPDATE SET
            repository_id = EXCLUDED.repository_id,
            number = EXCLUDED.number,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            state = EXCLUDED.state,
            html_url = EXCLUDED.html_url,
            imported_at = NOW()
        `,
        [
          repositoryId,
          issue.id,
          issue.number,
          issue.title,
          issue.body,
          issue.state,
          issue.html_url,
        ],
      );
    }

    await client.query("COMMIT");

    return {
      repositoryId,
      issuesSaved: issues.length,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}