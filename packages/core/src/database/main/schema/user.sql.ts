import { relations } from "drizzle-orm";
import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import {
  emailVerifications,
  passkeys,
  passwordResets,
  sessions,
  twoFactorAuthenticationCredentials,
} from "./auth.sql";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(), // will be converted to lower case
  passwordHash: text("password_hash"),
});
/** TODO: when checks get released in Drizzle ORM, add check for password.
 * Password can only be null if the user has at least a single passkey
 */
export const userRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  emailVerificationCode: one(emailVerifications),
  passkeys: many(passkeys),
  passwordReset: one(passwordResets),
  email: one(emails),
  twoFactorAuthenticationCredential: one(twoFactorAuthenticationCredentials),
}));

export const emails = pgTable("emails", {
  email: text("email").primaryKey(), // will be converted to lower case
  isVerified: boolean("is_verified").default(false).notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
});
export const emailRelations = relations(emails, ({ one }) => ({
  user: one(users, {
    fields: [emails.userId],
    references: [users.id],
  }),
}));