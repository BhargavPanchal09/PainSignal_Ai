import { z } from "zod";

import { repositoryReferenceSchema } from "@/lib/github/repository-url";
import { saveRepositoryIssues } from "@/lib/github/save-issues";

const requestSchema = z.object({
  repositoryUrl: repositoryReferenceSchema,
});

const githubEntrySchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(["open", "closed"]),
  html_url: z.url({
    protocol: /^https$/,
    hostname: /^github\.com$/,
  }),
  pull_request: z.object({}).optional(),
});

const ENTRIES_PER_PAGE = 30;
const MAX_PAGES = 3;
const MAX_ISSUES = 20;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Send a valid JSON request body." },
      { status: 400 },
    );
  }

  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error:
          result.error.issues[0]?.message ??
          "Enter a valid GitHub repository URL.",
      },
      { status: 400 },
    );
  }

  const { owner, repository } = result.data.repositoryUrl;

  const githubUrl = new URL(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues`,
  );

  githubUrl.searchParams.set("state", "all");
  githubUrl.searchParams.set("per_page", String(ENTRIES_PER_PAGE));
  githubUrl.searchParams.set("sort", "created");
  githubUrl.searchParams.set("direction", "desc");

  const collectedIssues: z.infer<typeof githubEntrySchema>[] = [];
  const seenIds = new Set<number>();

  let pagesFetched = 0;
  let entriesFetched = 0;

  // One shared time limit for all GitHub requests in this operation.
  const signal = AbortSignal.timeout(10_000);

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      githubUrl.searchParams.set("page", String(page));

      const response = await fetch(githubUrl, {
        headers: {
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
        signal,
        redirect: "error",
      });

      if (!response.ok) {
        if (response.status === 404) {
          return Response.json(
            { error: "Repository not found or unavailable to this application." },
            { status: 404 },
          );
        }

        if (response.status === 403 || response.status === 429) {
          return Response.json(
            {
              error:
                "GitHub refused this request. An API limit or access restriction may apply. Try again later.",
            },
            { status: 503 },
          );
        }

        return Response.json(
          { error: "GitHub could not complete the request. Try again later." },
          { status: 502 },
        );
      }

      const data: unknown = await response.json();
      const parsed = z.array(githubEntrySchema).safeParse(data);

      if (!parsed.success) {
        return Response.json(
          { error: "GitHub returned data in an unexpected format." },
          { status: 502 },
        );
      }

      pagesFetched++;
      entriesFetched += parsed.data.length;

      for (const entry of parsed.data) {
        if (entry.pull_request !== undefined || seenIds.has(entry.id)) {
          continue;
        }

        seenIds.add(entry.id);
        collectedIssues.push(entry);

        if (collectedIssues.length >= MAX_ISSUES) {
          break;
        }
      }

      if (collectedIssues.length >= MAX_ISSUES) {
        break;
      }

      const linkHeader = response.headers.get("link") ?? "";
      const hasNextPage = linkHeader.includes('rel="next"');

      if (!hasNextPage) {
        break;
      }
    }

    const issues = collectedIssues.map((entry) => ({
      id: entry.id,
      number: entry.number,
      title: entry.title,
      body: entry.body,
      state: entry.state,
      html_url: entry.html_url,
    }));
    try {
      await saveRepositoryIssues({ owner, repository }, issues);
    } catch {
      return Response.json(
        {
          error:
            "Issues were fetched from GitHub, but could not be saved. Try again later.",
        },
        { status: 503 },
      );
    }

    return Response.json({
      repository: { owner, repository },
      issues,
      sample: {
        pagesFetched,
        entriesFetched,
        issuesReturned: issues.length,
        maxPages: MAX_PAGES,
        maxIssues: MAX_ISSUES,
        note: "A bounded sample was checked. Older or additional issues may be omitted.",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Could not complete the GitHub requests within the time limit. Try again later.",
      },
      { status: 502 },
    );
  }
}