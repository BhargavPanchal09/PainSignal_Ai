import { beforeEach, expect, test, vi } from "vitest";

import { GET } from "../src/app/api/repositories/issues/route";
import { loadRepositoryIssues } from "@/lib/github/load-issues";

vi.mock("@/lib/github/load-issues", () => ({
  loadRepositoryIssues: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

test("rejects an invalid URL without querying the database", async () => {
  const request = new Request(
    "http://localhost/api/repositories/issues?repositoryUrl=hello",
  );

  const response = await GET(request);

  expect(response.status).toBe(400);

  expect(await response.json()).toEqual({
    error: "Enter an HTTPS GitHub repository URL.",
  });

  expect(loadRepositoryIssues).not.toHaveBeenCalled();
});

test("returns a helpful error when loading saved issues fails", async () => {
  vi.mocked(loadRepositoryIssues).mockRejectedValueOnce(
    new Error("Simulated database failure"),
  );

  const request = new Request(
    "http://localhost/api/repositories/issues?repositoryUrl=https%3A%2F%2Fgithub.com%2Ftest-owner%2Ftest-repo",
  );

  const response = await GET(request);

  expect(response.status).toBe(503);

  expect(await response.json()).toEqual({
    error: "Could not load saved issues. Try again later.",
  });

  expect(loadRepositoryIssues).toHaveBeenCalledExactlyOnceWith(
    "test-owner",
    "test-repo",
  );
});