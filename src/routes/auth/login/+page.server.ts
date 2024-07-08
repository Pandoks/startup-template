import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verify } from '@node-rs/argon2';
import { lucia } from '$lib/server/auth';
import { db } from '$lib/db';
import { users, type User } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { loginSchema } from './schema';
import { emailSchema } from '../schema';
import { validateAuthRequest } from '../validation';

export const actions: Actions = {
  login: async (event) => {
    const loginForm = await superValidate(event, zod(loginSchema));
    if (!loginForm.valid) {
      return fail(400, {
        success: false,
        loginForm
      });
    }

    let isUsername = true;
    const usernameOrEmail = loginForm.data.usernameOrEmail;
    if (!emailSchema.safeParse(usernameOrEmail).success) {
      isUsername = false;
    }

    let user: User | null = null;
    if (isUsername) {
      [user] = await db.select().from(users).where(eq(users.username, usernameOrEmail)).limit(1);
    } else {
      [user] = await db.select().from(users).where(eq(users.email, usernameOrEmail)).limit(1);
    }

    let validPassword = false;
    if (user) {
      validPassword = await verify(user.passwordHash, loginForm.data.password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1
      });
    }
    // NOTE: don't return incorrect user before hashing the password as it gives information to hackers
    if (!user || !validPassword) {
      console.log('test');
      return fail(400, {
        success: false,
        loginForm
      });
    }

    const session = await lucia.createSession(user.id, { isTwoFactorVerified: false });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    if (user.twoFactorSecret) {
      return redirect(302, '/auth/otp');
    }

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  validateAuthRequest({ event: event });
  return {
    loginForm: await superValidate(zod(loginSchema))
  };
};
