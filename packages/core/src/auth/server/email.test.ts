import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateEmailVerification } from "./email";
import { createDate } from "oslo";
import { TimeSpan } from "lucia";
import { eq } from "drizzle-orm";
import { database } from "../../database/main";
import { emails, users } from "../../database/main/schema/user.sql";
import { emailVerifications } from "../../database/main/schema/auth.sql";

describe("generateEmailVerification", () => {
  let db: PostgresJsDatabase;

  beforeAll(async () => {
    db = database;
  });

  beforeEach(async () => {
    // user just signed up but hasn't verified their email
    await db.transaction(async (tsx) => {
      await tsx.insert(users).values({
        id: "user",
        username: "username",
        passwordHash: "password",
      });
      await tsx.insert(emails).values({
        userId: "user",
        email: "test@example.com",
        isVerified: false,
      });
    });
  });

  afterEach(async () => {
    await db.delete(users); // cascade deletes everything related
  });

  it("should delete existing email verifications", async () => {
    await db.insert(emailVerifications).values({
      email: "test@example.com",
      code: "WRONG",
      expiresAt: createDate(new TimeSpan(15, "h")),
    });
    await generateEmailVerification({
      userId: "user",
      email: "test@example.com",
    });

    const results = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, "test@example.com"));
    expect(results.length).toBe(1);
  });

  it("should not delete other email verifications", async () => {
    await db.transaction(async (tsx) => {
      await tsx.insert(users).values({
        id: "user2",
        username: "username2",
        passwordHash: "password",
      });
      await tsx.insert(emails).values({
        userId: "user2",
        email: "test2@example.com",
        isVerified: false,
      });
      await tsx.insert(emailVerifications).values({
        email: "test@example.com",
        code: "WRONG",
        expiresAt: createDate(new TimeSpan(15, "h")),
      });
      await tsx.insert(emailVerifications).values({
        email: "test2@example.com",
        code: "WRONG",
        expiresAt: createDate(new TimeSpan(15, "h")),
      });
    });
    await generateEmailVerification({
      userId: "user",
      email: "test@example.com",
    });

    const databaseResult = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, "test@example.com"));
    expect(databaseResult.length).toBe(1);

    const [databaseResultUntouched] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, "test2@example.com"));
    expect(databaseResultUntouched.code).toBe("WRONG");
  });
});