import { z } from "zod";

export const repositoryUrlTextSchema = z
  .string()
  .trim()
  .min(1, "Enter a GitHub repository URL.")
  .max(300, "The repository URL is too long.");

export const repositoryUrlSchema = repositoryUrlTextSchema
  .pipe(
    z.url({
      protocol: /^https$/,
      hostname: /^github\.com$/,
      error: "Enter an HTTPS GitHub repository URL.",
    }),
  )
  .refine(
    (value) => {
      try {
        const url = new URL(value);

        const hasRepositoryPath =
          /^\/[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+\/?$/.test(url.pathname);

        const repositoryName = url.pathname.split("/")[2];

        return (
          hasRepositoryPath &&
          repositoryName !== "." &&
          repositoryName !== ".." &&
          url.username === "" &&
          url.password === "" &&
          url.port === "" &&
          url.search === "" &&
          url.hash === ""
        );
      } catch {
        return false;
      }
    },
    {
      error:
        "Use a repository homepage: https://github.com/owner/repository",
    },
  );

export const repositoryReferenceSchema = repositoryUrlSchema.transform(
  (value) => {
    const url = new URL(value);
    const parts = url.pathname.split("/");

    return {
      owner: parts[1],
      repository: parts[2],
    };
  },
);