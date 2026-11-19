import { afterEach, expect, test, vi } from "vitest";

import { POST } from "../src/app/api/github/issues/route";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("returns a helpful error when GitHub refuses the request", async () => {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response(null, {
      status: 403,
    }),
  );

  vi.stubGlobal("fetch", mockFetch);

  const request = new Request(
    "http://localhost/api/github/issues",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositoryUrl: "https://github.com/withastro/starlight",
      }),
    },
  );

  const response = await POST(request);

  expect(response.status).toBe(503);

  const body: unknown = await response.json();

  expect(body).toEqual({
    error:
      "GitHub refused this request. An API limit or access restriction may apply. Try again later.",
  });

  expect(mockFetch).toHaveBeenCalledTimes(1);
});
test("returns an error when the GitHub request times out", async () => {
  const mockFetch = vi.fn().mockRejectedValue(
    new DOMException("The request timed out.", "TimeoutError"),
  );

  vi.stubGlobal("fetch", mockFetch);

  const request = new Request(
    "http://localhost/api/github/issues",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositoryUrl: "https://github.com/withastro/starlight",
      }),
    },
  );

  const response = await POST(request);

  expect(response.status).toBe(502);

  const body: unknown = await response.json();

  expect(body).toEqual({
    error:
      "Could not complete the GitHub requests within the time limit. Try again later.",
  });

  expect(mockFetch).toHaveBeenCalledTimes(1);
});
test("does not return partial issues when a later batch fails", async () => {
  // Fictional data used only to test behavior.
  const firstBatch = [
    {
      id: 1,
      number: 1,
      title: "Fictional test report",
      body: "This report exists only inside the automated test.",
      state: "open",
      html_url: "https://github.com/test-owner/test-repo/issues/1",
    },
  ];

  const mockFetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(firstBatch, {
        headers: {
          Link: '<https://api.github.com/repos/test-owner/test-repo/issues?page=2>; rel="next"',
        },
      }),
    )
    .mockResolvedValueOnce(
      new Response(null, {
        status: 500,
      }),
    );

  vi.stubGlobal("fetch", mockFetch);

  const request = new Request(
    "http://localhost/api/github/issues",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositoryUrl: "https://github.com/test-owner/test-repo",
      }),
    },
  );

  const response = await POST(request);

  expect(response.status).toBe(502);

  const body: unknown = await response.json();

  expect(body).toEqual({
    error: "GitHub could not complete the request. Try again later.",
  });

  expect(mockFetch).toHaveBeenCalledTimes(2);
});
test("stops after three batches even when another page exists", async () => {
  // Fictional pull requests used only inside this test.
  const pullRequests = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    number: index + 1,
    title: "Fictional test pull request",
    body: null,
    state: "open",
    html_url: `https://github.com/test-owner/test-repo/pull/${index + 1}`,
    pull_request: {},
  }));

  const mockFetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      Response.json(pullRequests, {
        headers: {
          Link: '<https://api.github.com/repos/test-owner/test-repo/issues?page=2>; rel="next"',
        },
      }),
    ),
  );

  vi.stubGlobal("fetch", mockFetch);

  const request = new Request(
    "http://localhost/api/github/issues",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositoryUrl: "https://github.com/test-owner/test-repo",
      }),
    },
  );

  const response = await POST(request);
  const body: unknown = await response.json();

  expect(response.status).toBe(200);

  expect(body).toMatchObject({
    issues: [],
    sample: {
      pagesFetched: 3,
      entriesFetched: 90,
      issuesReturned: 0,
    },
  });

  expect(mockFetch).toHaveBeenCalledTimes(3);
});
test("returns at most twenty issues and stops requesting more batches", async () => {
  // Fictional issues used only inside this test.
  const issues = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    number: index + 1,
    title: `Fictional test issue ${index + 1}`,
    body: null,
    state: "open",
    html_url: `https://github.com/test-owner/test-repo/issues/${index + 1}`,
  }));

  const mockFetch = vi.fn().mockResolvedValue(
    Response.json(issues, {
      headers: {
        Link: '<https://api.github.com/repos/test-owner/test-repo/issues?page=2>; rel="next"',
      },
    }),
  );

  vi.stubGlobal("fetch", mockFetch);

  const request = new Request(
    "http://localhost/api/github/issues",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositoryUrl: "https://github.com/test-owner/test-repo",
      }),
    },
  );

  const response = await POST(request);
  const body: unknown = await response.json();

  expect(response.status).toBe(200);

  expect(body).toMatchObject({
    sample: {
      pagesFetched: 1,
      entriesFetched: 30,
      issuesReturned: 20,
    },
    issues: expect.any(Array),
  });

  expect(body).toHaveProperty("issues.length", 20);
  expect(mockFetch).toHaveBeenCalledTimes(1);
});