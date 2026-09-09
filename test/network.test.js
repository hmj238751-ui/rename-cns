import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry } from "../src/network.js";

test("metadata requests retry once after a transient server failure", async () => {
  let attempts = 0;
  const response = await fetchWithRetry("https://api.crossref.org/works/example", {
    timeoutMs: 8000,
    retries: 1,
    fetchImpl: async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("busy", { status: 503 })
        : new Response("ok", { status: 200 });
    }
  });

  assert.equal(attempts, 2);
  assert.equal(await response.text(), "ok");
});

test("metadata requests do not retry permanent client failures", async () => {
  let attempts = 0;
  await assert.rejects(
    fetchWithRetry("https://api.crossref.org/works/missing", {
      timeoutMs: 8000,
      retries: 1,
      fetchImpl: async () => {
        attempts += 1;
        return new Response("missing", { status: 404 });
      }
    }),
    /HTTP 404/
  );
  assert.equal(attempts, 1);
});
