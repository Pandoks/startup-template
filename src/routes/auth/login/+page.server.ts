import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verify } from '@node-rs/argon2';
import { handleAlreadyLoggedIn, lucia } from '$lib/auth/server';
import { db } from '$lib/db/postgres';
import { users, type User as DbUser } from '$lib/db/postgres/schema';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { loginPasskeySchema, loginSchema } from './schema';
import { emailSchema } from '../schema';
import { verifyPasskey } from '$lib/auth/passkey/server';
import { Throttler } from '$lib/rate-limit/server';
import { redis } from '$lib/db/redis';
import type { RedisClientType } from 'redis';

const throttler = new Throttler({
  name: 'login-throttle',
  storage: redis.main as RedisClientType,
  timeoutSeconds: [1, 2, 4, 8, 16, 30, 60, 180, 300, 600],
  resetType: 'instant',
  cutoffMilli: 24 * 60 * 60 * 1000,
  grace: 5
});

export const actions: Actions = {
  login: async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

    const loginForm = await superValidate(event, zod(loginSchema));
    if (!loginForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    let isUsername = true;
    const usernameOrEmail = loginForm.data.usernameOrEmail.toLowerCase();
    if (emailSchema.safeParse(usernameOrEmail).success) {
      isUsername = false;
    }

    let user: DbUser | null = null;
    if (isUsername) {
      [user] = await db.select().from(users).where(eq(users.username, usernameOrEmail)).limit(1);
    } else {
      [user] = await db.select().from(users).where(eq(users.email, usernameOrEmail)).limit(1);
    }

    let validPassword = false;
    if (user && user.passwordHash) {
      validPassword = await verify(user.passwordHash, loginForm.data.password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1
      });
    }
    // NOTE: don't return incorrect user before hashing the password as it gives information to hackers
    if (!user) {
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    const ipAddress = event.getClientAddress();
    const throttleKey = `${user.id}:${ipAddress}`;
    if (!(await throttler.check(throttleKey))) {
      return fail(429, {
        success: false,
        throttled: true,
        loginForm
      });
    } else if (!validPassword) {
      throttler.increment(throttleKey);
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    await throttler.reset(throttleKey);
    const session = await lucia.createSession(user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: false
    });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    if (!user.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    } else if (user.twoFactorSecret) {
      return redirect(302, '/auth/2fa/otp');
    }

    return redirect(302, '/');
  },
  'login-passkey': async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

    const loginForm = await superValidate(event, zod(loginPasskeySchema));
    if (!loginForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    let isUsername = true;
    const usernameOrEmail = loginForm.data.usernameOrEmail;
    if (emailSchema.safeParse(usernameOrEmail).success) {
      isUsername = false;
    }

    let user: DbUser | null = null;
    if (isUsername) {
      [user] = await db.select().from(users).where(eq(users.username, usernameOrEmail)).limit(1);
    } else {
      [user] = await db.select().from(users).where(eq(users.email, usernameOrEmail)).limit(1);
    }
    if (!user) {
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    const isValidPasskey = await verifyPasskey({
      userId: user.id,
      challengeId: loginForm.data.challengeId,
      credentialId: loginForm.data.credentialId,
      signature: loginForm.data.signature,
      encodedAuthenticatorData: loginForm.data.encodedAuthenticatorData,
      clientDataJSON: loginForm.data.clientDataJSON
    });

    const ipAddress = event.getClientAddress();
    const throttleKey = `${user.id}:${ipAddress}`;
    if (!(await throttler.check(throttleKey))) {
      return fail(429, {
        success: false,
        throttled: true,
        loginForm
      });
    } else if (!isValidPasskey) {
      throttler.increment(throttleKey);
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    await throttler.reset(throttleKey);
    const session = await lucia.createSession(user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: true
    });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    if (!user.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    }

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  handleAlreadyLoggedIn(event);
  if (event.locals.session) {
    return redirect(302, '/');
  }

  return {
    loginForm: await superValidate(zod(loginSchema)),
    loginPasskeyForm: await superValidate(zod(loginPasskeySchema))
  };
};
