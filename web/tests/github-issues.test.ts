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