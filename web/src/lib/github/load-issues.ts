import "server-only";

import { getDatabasePool } from "@/lib/db";

type SavedIssue = {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  imported_at: Date;
};

export async function loadRepositoryIssues(
  owner: string,
  repository: string,
) {
  const result = await getDatabasePool().query<SavedIssue>(
    `
      SELECT
        i.id,
        i.number,
        i.title,
        i.body,
        i.state,
        i.html_url,
        i.imported_at
      FROM issues AS i
      JOIN repositories AS r ON r.id = i.repository_id
      WHERE lower(r.owner) = lower($1)
        AND lower(r.name) = lower($2)
      ORDER BY i.number DESC
      LIMIT 20
    `,
    [owner, repository],
  );

  return result.rows;
}