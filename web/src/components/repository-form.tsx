"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { repositoryReferenceSchema } from "@/lib/github/repository-url";

export function RepositoryForm() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = repositoryReferenceSchema.safeParse(repositoryUrl);

    if (!result.success) {
      setMessage(
        result.error.issues[0]?.message ?? "Enter a valid repository URL.",
      );
      return;
    }

    setMessage(
      `URL format accepted. Owner: ${result.data.owner}. Repository: ${result.data.repository}. GitHub has not been contacted yet.`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-3">
      <label htmlFor="repository-url" className="block text-sm font-medium">
        GitHub repository URL
      </label>

      <input
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

      <Button type="submit">Analyze repository</Button>

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