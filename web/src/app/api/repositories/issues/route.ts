import { repositoryReferenceSchema } from "@/lib/github/repository-url";
import { loadRepositoryIssues } from "@/lib/github/load-issues";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const repositoryUrl = url.searchParams.get("repositoryUrl");

  const result = repositoryReferenceSchema.safeParse(repositoryUrl);

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

  const { owner, repository } = result.data;

  try {
    const issues = await loadRepositoryIssues(owner, repository);

    return Response.json({
      repository: { owner, repository },
      issues,
      limit: 20,
      note: "Saved issues only. GitHub was not contacted.",
    });
  } catch {
    return Response.json(
      { error: "Could not load saved issues. Try again later." },
      { status: 503 },
    );
  }
}