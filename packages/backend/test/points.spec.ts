import assert from "node:assert/strict";
import test from "node:test";
import { PointsService } from "../src/points/points.service";
import { HttpException } from "@nestjs/common";
import { ErrorCode } from "@cvbuilder/shared";

const userId = "user-1";

function makeTxClient(overrides: Record<string, any> = {}) {
  return {
    user: {
      updateMany: async () => ({ count: 1 }),
      findUniqueOrThrow: async () => ({ id: userId, points: 70 }),
      update: async () => ({ id: userId, points: 130 }),
      ...overrides.user,
    },
    pointTransaction: {
      create: async () => ({}),
      ...overrides.pointTransaction,
    },
  };
}

// ----- deduct -----

test("deduct decrements points, logs debit transaction, invalidates cache", async () => {
  const txCalls: string[] = [];
  const cacheDels: string[] = [];
  const txClient = makeTxClient({
    user: {
      updateMany: async () => { txCalls.push("updateMany"); return { count: 1 }; },
      findUniqueOrThrow: async () => { txCalls.push("findUnique"); return { id: userId, points: 70 }; },
    },
    pointTransaction: { create: async (args: any) => { txCalls.push("create"); return args.data; } },
  });
  const prisma = { $transaction: async (cb: (tx: any) => Promise<any>) => cb(txClient) };
  const cache = { del: async (k: string) => { cacheDels.push(k); } };
  const service = new PointsService(prisma as any, cache as any);

  const balance = await service.deduct(userId, 30, "AI分析", "ref-1");

  assert.equal(balance, 70);
  assert.deepEqual(txCalls, ["updateMany", "findUnique", "create"]);
  assert.deepEqual(cacheDels, [`cache:points:${userId}`]);
});

test("deduct throws QUOTA_EXCEEDED when balance is insufficient", async () => {
  const txClient = makeTxClient({
    user: {
      updateMany: async () => ({ count: 0 }), // no rows matched → insufficient
      findUniqueOrThrow: async () => ({ id: userId, points: 5 }),
    },
  });
  const prisma = { $transaction: async (cb: (tx: any) => Promise<any>) => cb(txClient) };
  const cache = { del: async () => undefined };
  const service = new PointsService(prisma as any, cache as any);

  await assert.rejects(
    service.deduct(userId, 30, "AI分析"),
    (err: HttpException) => {
      assert.equal(err.getStatus(), 403);
      const res = err.getResponse() as any;
      assert.equal(res.code, ErrorCode.QUOTA_EXCEEDED);
      assert.equal(res.data.balance, 5);
      return true;
    },
  );
});

// ----- credit -----

test("credit increments points and logs credit transaction", async () => {
  const txCalls: string[] = [];
  const cacheDels: string[] = [];
  const txClient = makeTxClient({
    user: { update: async () => { txCalls.push("update"); return { id: userId, points: 130 }; } },
    pointTransaction: { create: async () => { txCalls.push("create"); return {}; } },
  });
  const prisma = { $transaction: async (cb: (tx: any) => Promise<any>) => cb(txClient) };
  const cache = { del: async (k: string) => { cacheDels.push(k); } };
  const service = new PointsService(prisma as any, cache as any);

  const balance = await service.credit(userId, 100, "充值", "ref-1");

  assert.equal(balance, 130);
  assert.deepEqual(txCalls, ["update", "create"]);
  assert.deepEqual(cacheDels, [`cache:points:${userId}`]);
});

// ----- refund -----

test("refund increments points and logs refund transaction", async () => {
  const txCalls: string[] = [];
  const txClient = makeTxClient({
    user: { update: async () => { txCalls.push("update"); return { id: userId, points: 100 }; } },
    pointTransaction: { create: async () => { txCalls.push("create"); return {}; } },
  });
  const prisma = { $transaction: async (cb: (tx: any) => Promise<any>) => cb(txClient) };
  const cache = { del: async () => undefined };
  const service = new PointsService(prisma as any, cache as any);

  const balance = await service.refund(userId, 30, "AI失败退还", "ref-1");

  assert.equal(balance, 100);
  assert.deepEqual(txCalls, ["update", "create"]);
});

// ----- getBalance -----

test("getBalance returns balance and recent transactions with ISO dates", async () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const prisma = {
    user: { findUniqueOrThrow: async () => ({ id: userId, points: 50 }) },
    pointTransaction: {
      findMany: async () => [{ id: "t1", type: "debit", amount: 30, balance: 50, description: "AI分析", createdAt: now }],
    },
  };
  const cache = { del: async () => undefined };
  const service = new PointsService(prisma as any, cache as any);

  const result = await service.getBalance(userId);

  assert.equal(result.balance, 50);
  assert.equal(result.recentTransactions.length, 1);
  assert.equal(result.recentTransactions[0].createdAt, now.toISOString());
});
