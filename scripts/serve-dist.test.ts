import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDistServer } from "./serve-dist.ts";

async function serve(root: string, prefix = "/") {
  const server = createDistServer({ root, prefix });
  const listening = Promise.withResolvers<void>();
  server.listen(0, "127.0.0.1", listening.resolve);
  await listening.promise;
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => {
      const closed = Promise.withResolvers<void>();
      server.close((error) => (error ? closed.reject(error) : closed.resolve()));
      return closed.promise;
    },
  };
}

test("a missing 404.html answers a plain 404 instead of a half-sent response", async () => {
  const root = await mkdtemp(join(tmpdir(), "pg-serve-dist-"));
  try {
    await writeFile(join(root, "index.html"), "<h1>app</h1>");
    const server = await serve(root, "/pocket/");
    try {
      const response = await fetch(`${server.url}/pocket/missing`);
      assert.equal(response.status, 404);
      assert.equal(await response.text(), "Not found");
      const outside = await fetch(`${server.url}/elsewhere`);
      assert.equal(outside.status, 404);
      assert.equal(await outside.text(), "Not found");
    } finally {
      await server.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an existing 404.html is served for an unknown path", async () => {
  const root = await mkdtemp(join(tmpdir(), "pg-serve-dist-"));
  try {
    await writeFile(join(root, "404.html"), "<h1>missing</h1>");
    const server = await serve(root);
    try {
      const response = await fetch(`${server.url}/missing`);
      assert.equal(response.status, 404);
      assert.equal(await response.text(), "<h1>missing</h1>");
    } finally {
      await server.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
