import assert from "node:assert/strict";
import test from "node:test";
import { UserAwareThrottlerGuard } from "../src/common/throttler/user-aware-throttler.guard";

// getTracker is protected; access via type cast to test the tracker logic directly.
function getTracker(guard: UserAwareThrottlerGuard, req: Record<string, any>): Promise<string> {
  return (guard as any).getTracker(req);
}

// ThrottlerGuard base constructor needs (storage, reflector, options). getTracker doesn't use them.
function makeGuard() {
  return new UserAwareThrottlerGuard({} as any, {} as any, {} as any);
}

// ----- getTracker -----

test("getTracker uses userId when authenticated", async () => {
  const guard = makeGuard();
  const tracker = await getTracker(guard, { userId: "user-123", ip: "1.2.3.4" });

  assert.equal(tracker, "user:user-123");
});

test("getTracker falls back to ip for anonymous requests", async () => {
  const guard = makeGuard();
  const tracker = await getTracker(guard, { ip: "5.6.7.8" });

  assert.equal(tracker, "ip:5.6.7.8");
});

test("getTracker distinguishes different users", async () => {
  const guard = makeGuard();
  const a = await getTracker(guard, { userId: "a", ip: "1.1.1.1" });
  const b = await getTracker(guard, { userId: "b", ip: "1.1.1.1" });

  assert.notEqual(a, b);
});

test("getTracker distinguishes anonymous users by ip even with same userId absence", async () => {
  const guard = makeGuard();
  const a = await getTracker(guard, { ip: "1.1.1.1" });
  const b = await getTracker(guard, { ip: "2.2.2.2" });

  assert.notEqual(a, b);
});
