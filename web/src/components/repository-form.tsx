"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { repositoryReferenceSchema } from "@/lib/github/repository-url";

const issueSchema = z.object({
  id: z.union([z.number().int(), z.uuid()]),
  number: z.number().int(),
  title: z.string(),
  state: z.enum(["open", "closed"]),
  html_url: z.url({
    protocol: /^https$/,
    hostname: /^github\.com$/,
  }),
});

type Issue = z.infer<typeof issueSchema>;

const sampleResponseSchema = z.object({
  issues: z.array(issueSchema),
  sample: z.object({
    pagesFetched: z.number().int().nonnegative(),
    entriesFetched: z.number().int().nonnegative(),
    issuesReturned: z.number().int().nonnegative(),
  }),
});

const savedResponseSchema = z.object({
  issues: z.array(
    issueSchema.extend({
      id: z.uuid(),
    }),
  ),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

export function RepositoryForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<Issue[] | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setIssues(null);

    const result = repositoryReferenceSchema.safeParse(repositoryUrl);

    if (!result.success) {
      setMessage(
        result.error.issues[0]?.message ?? "Enter a valid repository URL.",
      );
      return;
    }

    setIsLoading(true);
    setMessage("Fetching and saving issues…");

    try {
      const response = await fetch("/api/github/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repositoryUrl }),
        signal: AbortSignal.timeout(15_000),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorResult = errorResponseSchema.safeParse(data);

        setMessage(
          errorResult.success
            ? errorResult.data.error
            : "The server could not complete the request.",
        );
        return;
      }

      const sampleResult = sampleResponseSchema.safeParse(data);

      if (!sampleResult.success) {
        setMessage("The server returned an unexpected response.");
        return;
      }

      const { pagesFetched, entriesFetched, issuesReturned } =
        sampleResult.data.sample;

      setIssues(sampleResult.data.issues);
      setMessage(
        `Saved ${issuesReturned} issues after checking ${entriesFetched} entries across ${pagesFetched} batches. Limits: 20 issues or 3 batches. Additional issues may be omitted.`,
      );
    } catch {
      setMessage(
        "Could not complete the request. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLoadSaved() {
    if (isLoading) {
      return;
    }

    setIssues(null);

    const result = repositoryReferenceSchema.safeParse(repositoryUrl);

    if (!result.success) {
      setMessage(
        result.error.issues[0]?.message ?? "Enter a valid repository URL.",
      );
      return;
    }

    setIsLoading(true);
    setMessage("Loading saved issues…");

    try {
      const parameters = new URLSearchParams({
        repositoryUrl: repositoryUrl.trim(),
      });

      const response = await fetch(
        `/api/repositories/issues?${parameters.toString()}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        },
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorResult = errorResponseSchema.safeParse(data);

        setMessage(
          errorResult.success
            ? errorResult.data.error
            : "Could not load saved issues.",
        );
        return;
      }

      const savedResult = savedResponseSchema.safeParse(data);

      if (!savedResult.success) {
        setMessage("The server returned an unexpected response.");
        return;
      }

      setIssues(savedResult.data.issues);
      setMessage(
        `Loaded ${savedResult.data.issues.length} saved issues, up to 20. GitHub was not contacted. Saved data may be older than GitHub.`,
      );
    } catch {
      setMessage("Could not load saved issues. Try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-3">
      <label htmlFor="repository-url" className="block text-sm font-medium">
        GitHub repository URL
      </label>

      <input
        disabled={isLoading}
        id="repository-url"
        name="repositoryUrl"
        type="text"
        value={repositoryUrl}
        onChange={(event) => {
          setRepositoryUrl(event.target.value);
          setMessage("");
          setIssues(null);
        }}
        placeholder="https://github.com/owner/repository"
        autoCapitalize="none"
        spellCheck={false}
        aria-describedby="repository-help repository-message"
        className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />

      <p id="repository-help" className="text-sm text-gray-600">
        Use a repository homepage, not an issue or pull request link.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isLoading}>
          Analyze repository
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={handleLoadSaved}
        >
          Load saved issues
        </Button>
      </div>

      <p
        id="repository-message"
        aria-live="polite"
        className="text-sm text-gray-700"
      >
        {message}
      </p>

      {issues !== null && (
        <section aria-labelledby="issues-heading" className="pt-6">
          <h2 id="issues-heading" className="text-xl font-semibold">
            Issue results
          </h2>

          {issues.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">
              No issues were returned for this request.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="rounded-lg border border-border p-4"
                >
                  <p className="text-sm text-gray-600">
                    #{issue.number} · {issue.state}
                  </p>

                  <h3 className="mt-2 break-words font-semibold">
                    {issue.title}
                  </h3>

                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    View on GitHub ↗
                    <span className="sr-only">
                      {" "}issue #{issue.number}, opens in a new tab
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </form>
  );
}