import { z } from "zod";

import { repositoryReferenceSchema } from "@/lib/github/repository-url";

const requestSchema = z.object({
  repositoryUrl: repositoryReferenceSchema,
});

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
  githubUrl.searchParams.set("per_page", "30");
  githubUrl.searchParams.set("page", "1");

  try {
    const response = await fetch(githubUrl, {
      headers: {
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
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

    const issues = parsed.data
      .filter((entry) => entry.pull_request === undefined)
      .map((entry) => ({
        id: entry.id,
        number: entry.number,
        title: entry.title,
        body: entry.body,
        state: entry.state,
        html_url: entry.html_url,
      }));

    return Response.json({
      repository: { owner, repository },
      issues,
      sample: {
        page: 1,
        entriesFetched: parsed.data.length,
        issuesReturned: issues.length,
        note: "Only the first batch was checked, not the full repository history.",
      },
    });
  } catch {
    return Response.json(
      { error: "Could not reach GitHub or the request timed out. Try again later." },
      { status: 502 },
    );
  }
}