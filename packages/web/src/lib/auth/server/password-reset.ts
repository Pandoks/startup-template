import { db } from '$lib/db/server/postgres';
import { passwordResets } from '$lib/db/postgres/schema/auth';
import { eq } from 'drizzle-orm';
import { generateIdFromEntropySize } from 'lucia';
import { createDate, TimeSpan } from 'oslo';
import { sha256 } from 'oslo/crypto';
import { encodeHex } from 'oslo/encoding';
import { NODE_ENV } from '$env/static/private';

// Token should be valid for at most a few hours
// Token should be hashed before storage as it's essentially a password
// SHA256 because token is long and random unlike use passwords
export const createPasswordResetToken = async ({ userId }: { userId: string }): Promise<string> => {
  const token = NODE_ENV === 'test' ? `${userId}-test` : generateIdFromEntropySize(25); // 40 characters

  await db.main.transaction(async (tsx) => {
    const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));
    await tsx.delete(passwordResets).where(eq(passwordResets.userId, userId)); // invalidate existing tokens
    await tsx.insert(passwordResets).values({
      tokenHash: tokenHash,
      userId: userId,
      expiresAt: createDate(new TimeSpan(2, 'h'))
    });
  });

  return token;
};

export const sendPasswordReset = async ({
  email,
  verificationLink
}: {
  email: string;
  verificationLink: string;
}) => {
  console.log(`Sending verification code: ${email}`);
  console.log(`Verification link: ${verificationLink}`);
};