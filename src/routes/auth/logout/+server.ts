import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lucia } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  const currentSession = event.locals.session;
  if (!currentSession) {
    return new Response(null, { status: 401 });
  }

  await lucia.invalidateSession(currentSession.id);
  const sessionCookie = lucia.createBlankSessionCookie();
  event.cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '.',
    ...sessionCookie.attributes
  });

  return redirect(302, '/');
};