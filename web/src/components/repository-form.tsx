"use client";
import { z } from "zod";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { repositoryReferenceSchema } from "@/lib/github/repository-url";

const sampleResponseSchema = z.object({
  sample: z.object({
    entriesFetched: z.number().int().nonnegative(),
    issuesReturned: z.number().int().nonnegative(),
  }),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

export function RepositoryForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (isLoading) {
    return;
  }

  const result = repositoryReferenceSchema.safeParse(repositoryUrl);

  if (!result.success) {
    setMessage(
      result.error.issues[0]?.message ?? "Enter a valid repository URL.",
    );
    return;
  }

  setIsLoading(true);
  setMessage("Fetching issues…");

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

    const { entriesFetched, issuesReturned } = sampleResult.data.sample;

    setMessage(
      `Found ${issuesReturned} issues among ${entriesFetched} entries in the first batch. This is not the full repository history.`,
    );
  } catch {
    setMessage(
      "Could not complete the request. Check your connection and try again.",
    );
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

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Fetching issues…" : "Analyze repository"}
      </Button>

      <p
        id="repository-message"
        aria-live="polite"
        className="text-sm text-gray-700"
      >
        {message}
      </p>
    </form>
  );
}