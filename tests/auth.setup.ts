import { expect, test as setup } from '@playwright/test';
import { db } from './db';
import { emails, users } from '$lib/db/postgres/schema';
import { and, eq } from 'drizzle-orm';
import { emailVerifications, sessions } from '$lib/db/postgres/schema/auth';
import { backupTestDatabase, resetTestDatabases } from './utils';
import dotenv from 'dotenv';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

const stateDir = 'playwright/.states';
await resetTestDatabases();

setup('partial password signup', async ({ page }) => {
  const username = 'partial_password_user';
  const email = 'partial_password_user@example.com';
  await page.goto('/auth/signup');

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

  await page.waitForURL('/auth/email-verification');

  const [newUser] = await db.main
    .select()
    .from(emails)
    .innerJoin(users, and((eq(users.id, emails.userId), eq(users.username, username))))
    .innerJoin(emailVerifications, eq(emailVerifications.email, emails.email))
    .innerJoin(sessions, eq(sessions.userId, users.id))
    .where(eq(emails.email, email))
    .limit(1);
  expect(newUser).toBeTruthy();
  expect(newUser.emails.isVerified).toBeFalsy();
  expect(newUser.email_verifications).toBeTruthy();
  expect(newUser.sessions).toBeTruthy();

  await page.context().storageState({ path: `${stateDir}/password-partial-signup.json` });
});

setup('full password signup', async ({ page }) => {
  const username = 'full_password_user';
  const email = 'full_password_user@example.com';
  const emailCode = 'TEST';
  await page.goto('/auth/signup');

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

  await page.waitForURL('/auth/email-verification');

  const [newUser] = await db.main
    .select()
    .from(emails)
    .innerJoin(users, and((eq(users.id, emails.userId), eq(users.username, username))))
    .innerJoin(emailVerifications, eq(emailVerifications.email, emails.email))
    .innerJoin(sessions, eq(sessions.userId, users.id))
    .where(eq(emails.email, email))
    .limit(1);
  expect(newUser).toBeTruthy();
  expect(newUser.emails.isVerified).toBeFalsy();
  expect(newUser.email_verifications).toBeTruthy();
  expect(newUser.sessions).toBeTruthy();

  await page.getByLabel('Verification Code').fill(emailCode);
  await page.getByRole('button', { name: 'Activate' }).click();

  await page.waitForURL('/');

  const [verifiedUser] = await db.main
    .select()
    .from(emails)
    .leftJoin(emailVerifications, eq(emailVerifications.email, emails.email))
    .where(eq(emails.email, email))
    .limit(1);
  expect(verifiedUser).toBeTruthy();
  expect(verifiedUser.emails.isVerified).toBeTruthy();
  expect(verifiedUser.email_verifications).toBeFalsy;

  await page.context().storageState({ path: `${stateDir}/password-full-signup.json` });
});

setup.afterAll('save database state', () => {
  backupTestDatabase({
    username: env.USER_DB_USERNAME,
    host: env.USER_DB_HOST,
    port: env.USER_DB_PORT,
    database: env.USER_DB_DATABASE,
    backupFile: 'playwright/.states/user-db.dump'
  });
});
