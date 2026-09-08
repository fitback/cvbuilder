import assert from "node:assert/strict";
import test from "node:test";
import { RechargesService } from "../src/recharges/recharges.service";
import { HttpException } from "@nestjs/common";
import { ErrorCode } from "@cvbuilder/shared";

const userId = "user-1";

// Minimal AlipayService stub that matches what RechargesService calls
function makeAlipay(overrides: Record<string, any> = {}) {
  return {
    isValidPlan: (amount: number) => [10, 20, 50].includes(amount),
    getPoints: (amount: number) => amount * 10,
    createOrder: async () => ({ paymentPage: "<html>pay</html>" }),
    parseNotify: (data: Record<string, string>) => ({
      outTradeNo: data.out_trade_no || "",
      tradeNo: data.trade_no || "",
      amount: 10,
      success: true,
    }),
    ...overrides,
  };
}

// ----- createOrder -----

test("createOrder rejects invalid plan amount", async () => {
  const prisma = { rechargeRecord: { create: async () => ({}), updateMany: async () => ({}) } };
  const alipay = makeAlipay();
  const points = {};
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  await assert.rejects(
    service.createOrder(userId, 99),
    (err: HttpException) => {
      assert.equal(err.getStatus(), 400);
      const res = err.getResponse() as any;
      assert.equal(res.code, ErrorCode.INVALID_PARAMS);
      return true;
    },
  );
});

test("createOrder creates pending record then saves payment page", async () => {
  const calls: { method: string; args: any }[] = [];
  const prisma = {
    rechargeRecord: {
      create: async (args: any) => { calls.push({ method: "create", args }); return {}; },
      updateMany: async (args: any) => { calls.push({ method: "updateMany", args }); return {}; },
    },
  };
  const alipay = makeAlipay();
  const points = {};
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  const result = await service.createOrder(userId, 10);

  // 1. create pending record with correct amount + points
  assert.equal(calls[0].method, "create");
  assert.equal(calls[0].args.data.userId, userId);
  assert.equal(calls[0].args.data.amount, 10);
  assert.equal(calls[0].args.data.points, 100); // 10 * 10
  assert.equal(calls[0].args.data.status, "pending");

  // 2. updateMany saves the payment page HTML
  assert.equal(calls[1].method, "updateMany");
  assert.equal(calls[1].args.data.codeUrl, "<html>pay</html>");

  assert.equal(result.amount, 10);
  assert.equal(result.points, 100);
  assert.ok(result.outTradeNo.startsWith("RC"));
});

// ----- handleNotify -----

test("handleNotify approves pending order and credits points", async () => {
  const record = { id: "rc-1", userId, outTradeNo: "RC123", amount: 10, points: 100, status: "pending" };
  const updates: any[] = [];
  const creditCalls: any[] = [];
  const prisma = {
    rechargeRecord: {
      findFirst: async () => record,
      update: async (args: any) => { updates.push(args); return { ...record, status: "approved" }; },
    },
  };
  const alipay = makeAlipay();
  const points = { credit: async (...args: any[]) => { creditCalls.push(args); return 100; } };
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  const result = await service.handleNotify({ out_trade_no: "RC123", trade_no: "T1" });

  assert.equal(result.code, "SUCCESS");
  assert.equal(updates[0].data.status, "approved");
  assert.equal(updates[0].data.transactionId, "T1");
  // points.credit called with userId, points, description, rechargeRecordId
  assert.deepEqual(creditCalls[0], [userId, 100, "支付宝充值 10 元", "rc-1"]);
});

test("handleNotify is idempotent — already approved returns SUCCESS without re-crediting", async () => {
  const record = { id: "rc-1", userId, outTradeNo: "RC123", amount: 10, points: 100, status: "approved" };
  let creditCalled = false;
  const prisma = { rechargeRecord: { findFirst: async () => record, update: async () => ({}) } };
  const alipay = makeAlipay();
  const points = { credit: async () => { creditCalled = true; return 100; } };
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  const result = await service.handleNotify({ out_trade_no: "RC123", trade_no: "T1" });

  assert.equal(result.code, "SUCCESS");
  assert.equal(creditCalled, false, "must not credit points twice");
});

test("handleNotify returns FAIL for unknown order", async () => {
  const prisma = { rechargeRecord: { findFirst: async () => null } };
  const alipay = makeAlipay();
  const points = { credit: async () => 100 };
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  const result = await service.handleNotify({ out_trade_no: "UNKNOWN", trade_no: "T1" });

  assert.equal(result.code, "FAIL");
});

test("handleNotify returns FAIL when parseNotify returns null", async () => {
  const prisma = { rechargeRecord: { findFirst: async () => ({ id: "rc-1" }) } };
  const alipay = makeAlipay({ parseNotify: () => null });
  const points = {};
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  const result = await service.handleNotify({ out_trade_no: "RC123" });

  assert.equal(result.code, "FAIL");
});

// ----- getStatus -----

test("getStatus returns record for the owner", async () => {
  const record = { id: "rc-1", userId, outTradeNo: "RC123", status: "pending", amount: 10, points: 100 };
  const prisma = { rechargeRecord: { findFirst: async () => record } };
  const alipay = makeAlipay();
  const points = {};
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  const result = await service.getStatus("RC123", userId);

  assert.equal(result.status, "pending");
  assert.equal(result.amount, 10);
});

test("getStatus throws 404 when record belongs to another user", async () => {
  const prisma = { rechargeRecord: { findFirst: async () => null } }; // findFirst with userId filter returns null
  const alipay = makeAlipay();
  const points = {};
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  await assert.rejects(
    service.getStatus("RC123", "intruder"),
    (err: HttpException) => {
      assert.equal(err.getStatus(), 404);
      return true;
    },
  );
});

// ----- expireStalePending -----

test("expireStalePending marks pending records older than 24h as expired", async () => {
  const updates: any[] = [];
  const prisma = {
    rechargeRecord: {
      updateMany: async (args: any) => { updates.push(args); return { count: 3 }; },
    },
  };
  const alipay = makeAlipay();
  const points = {};
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  const count = await service.expireStalePending();

  assert.equal(count, 3);
  assert.equal(updates[0].data.status, "expired");
  assert.equal(updates[0].where.status, "pending");
  assert.ok(updates[0].where.createdAt.lt instanceof Date);
});

test("expireStalePending returns 0 and does not throw when prisma fails", async () => {
  const prisma = {
    rechargeRecord: { updateMany: async () => { throw new Error("db down"); } },
  };
  const alipay = makeAlipay();
  const points = {};
  const service = new RechargesService(prisma as any, points as any, alipay as any);

  const count = await service.expireStalePending();

  assert.equal(count, 0);
});
