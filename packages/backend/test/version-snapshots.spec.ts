import assert from "node:assert/strict";
import test from "node:test";
import { GeneratedResumesService } from "../src/generated-resumes/generated-resumes.service";
import { ResumesService } from "../src/resumes/resumes.service";
import { HttpException } from "@nestjs/common";

const userId = "user-1";

// ----- Generated resume: update snapshots previous content -----

test("generated resume update snapshots the previous content before saving", async () => {
  const versions: unknown[] = [];
  const record = {
    id: "generated-1", userId, name: "Old name", content: "old content", resumeId: null,
    analysisRecordId: null, createdAt: new Date(), updatedAt: new Date(),
  };
  const prisma = {
    generatedResume: {
      findUnique: async () => record,
      findFirst: async () => null,
      update: async ({ data }: { data: { name: string; content: string } }) => ({ ...record, ...data }),
    },
    generatedResumeVersion: {
      create: async ({ data }: { data: unknown }) => versions.push(data),
      findMany: async () => [],
      deleteMany: async () => undefined,
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
  };
  const service = new GeneratedResumesService(prisma as any);

  await service.update(record.id, userId, { name: "New name", content: "new content" });

  assert.deepEqual(versions, [{ generatedResumeId: record.id, name: "Old name", content: "old content", source: "auto" }]);
});

// ----- Original resume: update snapshots previous content -----

test("original resume update snapshots the previous editable fields before saving", async () => {
  const versions: unknown[] = [];
  const record = {
    id: "resume-1", userId, parseResult: { name: "Old name" }, rawText: "old text",
    fileNameOriginal: "resume.pdf", fileType: "pdf", fileSize: 1, parseStatus: "parsed",
    freeAnalysisCount: 3, createdAt: new Date(), _count: { analysisRecords: 0 },
  };
  const prisma = {
    resume: {
      findUnique: async () => record,
      update: async () => record,
    },
    resumeVersion: {
      create: async ({ data }: { data: unknown }) => versions.push(data),
      findMany: async () => [],
      deleteMany: async () => undefined,
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
  };
  const cache = { del: async () => undefined };
  const service = new ResumesService(prisma as any, cache as any, {} as any);

  await service.update(record.id, userId, { parseResult: { name: "New name" }, rawText: "new text" });

  assert.deepEqual(versions, [{ resumeId: record.id, parseResult: { name: "Old name" }, rawText: "old text", source: "auto" }]);
});

// ----- trimVersions: only keeps the latest 20 records, deletes the oldest -----

test("generated resume trim deletes versions beyond the 20-record limit", async () => {
  let deletedIds: string[] = [];
  // Existing 22 records sorted desc by createdAt (newest first). After inserting 1 new auto snapshot,
  // trim finds the records beyond limit (skip 20) and deletes them.
  const existing = Array.from({ length: 22 }, (_, i) => ({ id: `v${i}`, createdAt: new Date(i) }));
  const prisma = {
    generatedResume: {
      findUnique: async () => ({ id: "generated-1", userId, name: "Old", content: "old", resumeId: null, analysisRecordId: null, createdAt: new Date(), updatedAt: new Date() }),
      findFirst: async () => null,
      update: async ({ data }: { data: { name: string; content: string } }) => ({ id: "generated-1", userId, ...data, resumeId: null, analysisRecordId: null, createdAt: new Date(), updatedAt: new Date() }),
    },
    generatedResumeVersion: {
      create: async ({ data }: { data: unknown }) => { versions.push(data); return { id: `v${versions.length}`, ...data as object }; },
      findMany: async ({ skip = 0 }: { skip?: number } = {}) => existing.slice(skip),
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => { deletedIds = where.id.in; },
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
  };
  const versions: unknown[] = [];
  const service = new GeneratedResumesService(prisma as any);

  await service.update("generated-1", userId, { name: "New", content: "new" });

  // skip 20 → returns v20, v21 → deleteMany called with [v20, v21]
  assert.equal(deletedIds.length, 2);
  assert.deepEqual(deletedIds, ["v20", "v21"]);
});

test("original resume trim deletes versions beyond the 20-record limit", async () => {
  let deletedIds: string[] = [];
  const existing = Array.from({ length: 21 }, (_, i) => ({ id: `v${i}`, createdAt: new Date(i) }));
  const record = {
    id: "resume-1", userId, parseResult: { name: "Old" }, rawText: "old",
    fileNameOriginal: "r.pdf", fileType: "pdf", fileSize: 1, parseStatus: "parsed",
    freeAnalysisCount: 3, createdAt: new Date(), _count: { analysisRecords: 0 },
  };
  const prisma = {
    resume: {
      findUnique: async () => record,
      update: async () => record,
    },
    resumeVersion: {
      create: async ({ data }: { data: unknown }) => { versions.push(data); return { id: `v${versions.length}`, ...data as object }; },
      findMany: async ({ skip = 0 }: { skip?: number } = {}) => existing.slice(skip),
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => { deletedIds = where.id.in; },
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
  };
  const versions: unknown[] = [];
  const cache = { del: async () => undefined };
  const service = new ResumesService(prisma as any, cache as any, {} as any);

  await service.update(record.id, userId, { parseResult: { name: "New" }, rawText: "new" });

  assert.equal(deletedIds.length, 1);
  assert.deepEqual(deletedIds, ["v20"]);
});

// ----- Cross-user access is rejected with 404 -----

test("generated resume versions reject access from a different user", async () => {
  const record = { id: "generated-1", userId: "owner", name: "n", content: "c", resumeId: null, analysisRecordId: null, createdAt: new Date(), updatedAt: new Date() };
  const prisma = {
    generatedResume: { findUnique: async () => record, findFirst: async () => null, update: async () => record },
    generatedResumeVersion: { findMany: async () => [], findFirst: async () => null, create: async () => ({}), deleteMany: async () => undefined },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
  };
  const service = new GeneratedResumesService(prisma as any);

  await assert.rejects(service.listVersions("generated-1", "intruder"), (err: HttpException) => {
    assert.equal(err.getStatus(), 404);
    return true;
  });
});

test("original resume versions reject access from a different user", async () => {
  const record = { id: "resume-1", userId: "owner", parseResult: null, rawText: null, fileNameOriginal: "r.pdf", fileType: "pdf", fileSize: 1, parseStatus: "parsed", freeAnalysisCount: 3, createdAt: new Date(), _count: { analysisRecords: 0 } };
  const prisma = {
    resume: { findUnique: async () => record, update: async () => record },
    resumeVersion: { findMany: async () => [], findFirst: async () => null, create: async () => ({}), deleteMany: async () => undefined },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
  };
  const cache = { del: async () => undefined };
  const service = new ResumesService(prisma as any, cache as any, {} as any);

  await assert.rejects(service.listVersions("resume-1", "intruder"), (err: HttpException) => {
    assert.equal(err.getStatus(), 404);
    return true;
  });
});

// ----- restoreVersion writes a before_restore snapshot before overwriting -----

test("generated resume restore writes a before_restore snapshot then the auto snapshot", async () => {
  const versions: unknown[] = [];
  const current = { id: "generated-1", userId, name: "Current name", content: "current content", resumeId: null, analysisRecordId: null, createdAt: new Date(), updatedAt: new Date() };
  const target = { id: "v-target", generatedResumeId: "generated-1", name: "Old name", content: "old content", source: "manual", label: null, createdAt: new Date() };
  const prisma = {
    generatedResume: {
      findUnique: async () => current,
      findFirst: async () => null,
      update: async ({ data }: { data: { name: string; content: string } }) => ({ ...current, ...data }),
    },
    generatedResumeVersion: {
      findFirst: async () => target,
      create: async ({ data }: { data: unknown }) => { versions.push(data); return { id: `v${versions.length}`, ...data as object }; },
      findMany: async () => [],
      deleteMany: async () => undefined,
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
  };
  const service = new GeneratedResumesService(prisma as any);

  await service.restoreVersion("generated-1", "v-target", userId);

  // restoreVersion creates exactly 2 snapshots: before_restore (current) + auto (target)
  assert.equal(versions.length, 2);
  assert.deepEqual(versions[0], { generatedResumeId: "generated-1", name: "Current name", content: "current content", source: "before_restore" });
  assert.deepEqual(versions[1], { generatedResumeId: "generated-1", name: "Old name", content: "old content", source: "auto" });
});

test("original resume restore writes a before_restore snapshot then the auto snapshot", async () => {
  const versions: unknown[] = [];
  const current = { id: "resume-1", userId, parseResult: { name: "Current" }, rawText: "current", fileNameOriginal: "r.pdf", fileType: "pdf", fileSize: 1, parseStatus: "parsed", freeAnalysisCount: 3, createdAt: new Date(), _count: { analysisRecords: 0 } };
  const target = { id: "v-target", resumeId: "resume-1", parseResult: { name: "Old" }, rawText: "old", source: "manual", label: null, createdAt: new Date() };
  const prisma = {
    resume: {
      findUnique: async () => current,
      update: async () => current,
    },
    resumeVersion: {
      findFirst: async () => target,
      create: async ({ data }: { data: unknown }) => { versions.push(data); return { id: `v${versions.length}`, ...data as object }; },
      findMany: async () => [],
      deleteMany: async () => undefined,
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
  };
  const cache = { del: async () => undefined };
  const service = new ResumesService(prisma as any, cache as any, {} as any);

  await service.restoreVersion("resume-1", "v-target", userId);

  assert.equal(versions.length, 2);
  assert.deepEqual(versions[0], { resumeId: "resume-1", parseResult: { name: "Current" }, rawText: "current", source: "before_restore" });
  assert.deepEqual(versions[1], { resumeId: "resume-1", parseResult: { name: "Old" }, rawText: "old", source: "auto" });
});