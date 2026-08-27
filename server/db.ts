import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { completionCodes, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

const hash = (value: string) => createHash("sha256").update(value.trim().toUpperCase()).digest("hex");

/** 4×4 문자 코드. 원문은 발급 응답에서만 반환하고 DB에는 해시만 남긴다. */
export function createPrizeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  const groups = Array.from({ length: 4 }, (_, group) =>
    Array.from({ length: 4 }, (_, index) => alphabet[bytes[group * 4 + index] % alphabet.length]).join("")
  );
  return `YE-${groups.join("-")}`;
}

export async function issueCompletionCode(participationToken: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("행사 기록 저장소에 연결할 수 없습니다.");
  const participationHash = hash(participationToken);
  const existing = await db.select().from(completionCodes).where(eq(completionCodes.participationHash, participationHash)).limit(1);
  if (existing[0]) return { state: "alreadyIssued" as const };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = createPrizeCode();
    try {
      await db.insert(completionCodes).values({ participationHash, codeHash: hash(code), expiresAt });
      return { state: "issued" as const, code, expiresAt };
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  throw new Error("완주 코드를 발급하지 못했습니다.");
}

export async function redeemCompletionCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("행사 기록 저장소에 연결할 수 없습니다.");
  const now = new Date();
  const rows = await db.select().from(completionCodes).where(eq(completionCodes.codeHash, hash(code))).limit(1);
  const record = rows[0];
  if (!record) return { state: "notFound" as const };
  if (record.redeemedAt || record.status === "redeemed") return { state: "alreadyRedeemed" as const };
  if (record.expiresAt <= now || record.status === "expired") {
    await db.update(completionCodes).set({ status: "expired" }).where(eq(completionCodes.id, record.id));
    return { state: "expired" as const };
  }
  const [result] = await db.update(completionCodes).set({ status: "redeemed", redeemedAt: now }).where(and(eq(completionCodes.id, record.id), isNull(completionCodes.redeemedAt), gt(completionCodes.expiresAt, now)));
  if (result.affectedRows !== 1) return { state: "alreadyRedeemed" as const };
  return { state: "redeemed" as const, redeemedAt: now };
}

export async function getCompletionCodeStatus(code: string) {
  const db = await getDb();
  if (!db) throw new Error("행사 기록 저장소에 연결할 수 없습니다.");
  const rows = await db.select().from(completionCodes).where(eq(completionCodes.codeHash, hash(code))).limit(1);
  const record = rows[0];
  if (!record) return { state: "notFound" as const };
  if (record.redeemedAt || record.status === "redeemed") return { state: "redeemed" as const, redeemedAt: record.redeemedAt };
  if (record.expiresAt <= new Date() || record.status === "expired") return { state: "expired" as const, expiresAt: record.expiresAt };
  return { state: "issued" as const, expiresAt: record.expiresAt };
}
