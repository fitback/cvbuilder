import assert from "node:assert/strict";
import test from "node:test";
import { CacheService } from "../src/common/cache/cache.service";

// ----- getOrSet -----

test("getOrSet returns cached value and skips factory on hit", async () => {
  let factoryCalled = false;
  const redis = {
    get: async (key: string) => key === "k1" ? JSON.stringify({ a: 1 }) : null,
    setex: async () => "OK",
  };
  const service = new CacheService(redis as any);

  const data = await service.getOrSet("k1", 60, async () => { factoryCalled = true; return { a: 99 }; });

  assert.deepEqual(data, { a: 1 });
  assert.equal(factoryCalled, false);
});

test("getOrSet calls factory and caches result on miss", async () => {
  const sets: { key: string; ttl: number; value: string }[] = [];
  const redis = {
    get: async () => null,
    setex: async (key: string, ttl: number, value: string) => { sets.push({ key, ttl, value }); return "OK"; },
  };
  const service = new CacheService(redis as any);

  const data = await service.getOrSet("k2", 120, async () => ({ b: 2 }));

  assert.deepEqual(data, { b: 2 });
  assert.equal(sets.length, 1);
  assert.equal(sets[0].key, "k2");
  assert.equal(sets[0].ttl, 120);
  assert.deepEqual(JSON.parse(sets[0].value), { b: 2 });
});

test("getOrSet falls through to factory on corrupt cached JSON", async () => {
  const redis = {
    get: async () => "{not-valid-json",
    setex: async () => "OK",
  };
  const service = new CacheService(redis as any);

  const data = await service.getOrSet("k3", 60, async () => ({ c: 3 }));

  assert.deepEqual(data, { c: 3 });
});

test("getOrSet falls through to factory when redis.get throws", async () => {
  const redis = {
    get: async () => { throw new Error("redis down"); },
    setex: async () => "OK",
  };
  const service = new CacheService(redis as any);

  const data = await service.getOrSet("k4", 60, async () => ({ d: 4 }));

  assert.deepEqual(data, { d: 4 });
});

test("getOrSet swallows redis.setex failure and still returns data", async () => {
  const redis = {
    get: async () => null,
    setex: async () => { throw new Error("redis down"); },
  };
  const service = new CacheService(redis as any);

  const data = await service.getOrSet("k5", 60, async () => ({ e: 5 }));

  assert.deepEqual(data, { e: 5 });
});

// ----- del (pattern-based scan + delete) -----

test("del scans matching keys and deletes them", async () => {
  const deleted: string[] = [];
  const redis = {
    scan: async (_cursor: string, _cmd: string, pattern: string) => {
      // Return cursor "0" (done) + matching keys
      return ["0", [`${pattern}:1`, `${pattern}:2`]];
    },
    del: async (keys: string[]) => { deleted.push(...keys); return keys.length; },
  };
  const service = new CacheService(redis as any);

  await service.del("cache:points:*");

  assert.deepEqual(deleted, ["cache:points:*:1", "cache:points:*:2"]);
});

test("del iterates multiple scan pages until cursor is 0", async () => {
  const deleted: string[] = [];
  let page = 0;
  const redis = {
    scan: async () => {
      page++;
      if (page === 1) return ["10", ["key-a"]]; // more pages
      return ["0", ["key-b"]]; // last page
    },
    del: async (keys: string[]) => { deleted.push(...keys); return keys.length; },
  };
  const service = new CacheService(redis as any);

  await service.del("cache:jobs:*");

  assert.deepEqual(deleted, ["key-a", "key-b"]);
});

test("del swallows redis errors and does not throw", async () => {
  const redis = {
    scan: async () => { throw new Error("redis down"); },
    del: async () => 0,
  };
  const service = new CacheService(redis as any);

  // must not throw
  await service.del("cache:anything:*");
});
