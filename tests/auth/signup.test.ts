import { db } from '$lib/db/postgres';
import { users } from '$lib/db/postgres/schema';
import { redis } from '$lib/db/redis';
import { resetTestDatabases } from '$lib/test';
import { test } from '@playwright/test';

test.describe('Sign up', () => {
  test.beforeEach(async () => {
    const test = await db.test!.select().from(users);
    const test1 = await redis.test?.instance.flushAll();
  });

  test('should allow a user to sign up', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Email').fill('test@example.com');
    await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    await page.waitForURL('/auth/email-verification');
    await page.getByLabel('Verification Code').fill('TEST');
    await page.getByRole('button', { name: 'Activate' }).click();
  });
});